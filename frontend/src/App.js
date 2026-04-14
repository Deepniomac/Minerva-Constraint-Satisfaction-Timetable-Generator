import { useMemo, useState } from "react";
import axios from "axios";
import "./App.css";

const API_BASE = "http://127.0.0.1:8000";

export default function App() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [role, setRole] = useState(localStorage.getItem("role") || "");
  const [message, setMessage] = useState("Login to manage timetables.");
  const [nameInput, setNameInput] = useState("");
  const [deptInput, setDeptInput] = useState("");
  const [semesterInput, setSemesterInput] = useState("");
  const [runIdInput, setRunIdInput] = useState("");
  const [rows, setRows] = useState([]);
  const [timeslots, setTimeslots] = useState([]);
  const [validation, setValidation] = useState(null);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [overrideTimeslotId, setOverrideTimeslotId] = useState("");
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  async function login() {
    try {
      const res = await axios.post(`${API_BASE}/login?username=${username}&password=${password}`);
      localStorage.setItem("token", res.data.access_token);
      localStorage.setItem("role", res.data.role);
      setToken(res.data.access_token);
      setRole(res.data.role);
      setMessage(`Logged in as ${res.data.username} (${res.data.role})`);
    } catch (error) {
      setMessage(error?.response?.data?.detail || "Login failed");
    }
  }

  async function listDepartments() {
    try {
      const res = await axios.get(`${API_BASE}/departments/`, { headers: authHeaders });
      setRows(res.data || []);
      setMessage("Departments loaded");
    } catch (error) {
      setMessage(error?.response?.data?.detail || "Failed to load departments");
    }
  }

  async function loadTimeslots() {
    try {
      const res = await axios.get(`${API_BASE}/timetable/timeslots`, { headers: authHeaders });
      setTimeslots(res.data || []);
    } catch (error) {
      setMessage(error?.response?.data?.detail || "Failed to load timeslots");
    }
  }

  async function createDepartment() {
    try {
      await axios.post(`${API_BASE}/departments/?name=${encodeURIComponent(nameInput)}`, {}, { headers: authHeaders });
      setMessage("Department created");
      setNameInput("");
      listDepartments();
    } catch (error) {
      setMessage(error?.response?.data?.detail || "Failed to create department");
    }
  }

  async function createFaculty() {
    try {
      await axios.post(`${API_BASE}/faculty/?name=${encodeURIComponent(nameInput)}&dept_id=${encodeURIComponent(deptInput)}`, {}, { headers: authHeaders });
      setMessage("Faculty created");
      setNameInput("");
      setDeptInput("");
    } catch (error) {
      setMessage(error?.response?.data?.detail || "Failed to create faculty");
    }
  }

  async function generateTimetable() {
    try {
      const qs = semesterInput ? `?semester_id=${encodeURIComponent(semesterInput)}` : "";
      const res = await axios.post(`${API_BASE}/timetable/generate${qs}`, {}, { headers: authHeaders });
      setRunIdInput(String(res.data.run_id || ""));
      await loadRunTimetable(res.data.run_id);
      setValidation(res.data.validation || null);
      setMessage(`${res.data.message} | run=${res.data.run_id} | version=${res.data.version}`);
    } catch (error) {
      setMessage(error?.response?.data?.detail || error?.response?.data?.error || "Generation failed");
    }
  }

  async function validateRun() {
    try {
      const qs = runIdInput ? `?run_id=${encodeURIComponent(runIdInput)}` : "";
      const res = await axios.post(`${API_BASE}/timetable/validate${qs}`, {}, { headers: authHeaders });
      setValidation(res.data);
      setMessage(res.data.is_valid ? "Validation passed: no hard conflicts." : "Validation found conflicts.");
    } catch (error) {
      setMessage(error?.response?.data?.detail || "Validation failed");
    }
  }

  async function publishRun() {
    try {
      if (!runIdInput) return setMessage("Enter run ID to publish.");
      await axios.post(`${API_BASE}/timetable/publish?run_id=${encodeURIComponent(runIdInput)}`, {}, { headers: authHeaders });
      setMessage(`Run ${runIdInput} published.`);
    } catch (error) {
      setMessage(error?.response?.data?.detail || error?.response?.data?.error || "Publish failed");
    }
  }

  async function listRuns() {
    try {
      const res = await axios.get(`${API_BASE}/timetable/runs`, { headers: authHeaders });
      setRows(res.data || []);
      setMessage("Timetable runs loaded.");
    } catch (error) {
      setMessage(error?.response?.data?.detail || "Failed to load runs");
    }
  }

  async function loadRunTimetable(runId = runIdInput) {
    try {
      const qs = runId ? `?run_id=${encodeURIComponent(runId)}` : "";
      const res = await axios.get(`${API_BASE}/timetable/${qs}`, { headers: authHeaders });
      setRows(res.data || []);
      setMessage("Timetable loaded.");
    } catch (error) {
      setMessage(error?.response?.data?.detail || "Failed to load timetable");
    }
  }

  async function overrideEntry() {
    try {
      if (!selectedAssignmentId || !overrideTimeslotId) return setMessage("Select assignment and target timeslot.");
      const res = await axios.post(
        `${API_BASE}/timetable/override?assignment_id=${encodeURIComponent(selectedAssignmentId)}&timeslot_id=${encodeURIComponent(overrideTimeslotId)}`,
        {},
        { headers: authHeaders }
      );
      setValidation(res.data.validation || null);
      await loadRunTimetable(runIdInput);
      setMessage("Manual override applied.");
    } catch (error) {
      setMessage(error?.response?.data?.detail || error?.response?.data?.error || "Override failed");
    }
  }

  const isAdminLike = role === "admin" || role === "department_head";
  const dayOrder = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const orderedDays = useMemo(() => Array.from(new Set(rows.map((r) => r.day).filter(Boolean))).sort((a, b) => (dayOrder.indexOf(a) === -1 ? 99 : dayOrder.indexOf(a)) - (dayOrder.indexOf(b) === -1 ? 99 : dayOrder.indexOf(b))), [rows]);
  const orderedSlots = useMemo(() => Array.from(new Set(rows.map((r) => r.time).filter(Boolean))).sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true })), [rows]);
  const conflictCells = useMemo(() => new Set((validation?.conflicts || []).map((c) => `${c.day}__${c.slot}`)), [validation]);
  const cellMap = useMemo(() => new Map(rows.map((r) => [`${r.day}__${r.time}`, r])), [rows]);

  return (
    <main className="app-shell">
      <aside className="left-panel">
        <h1>Minerva</h1>
        <p className="muted">Project Details & Schedule</p>
        <div className="status-pill">{message}</div>

        <div className="card">
          <h3>Login</h3>
          <input className="field" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
          <input className="field" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button className="btn btn-primary" onClick={login}>Login</button>
        </div>

        <div className="card">
          <h3>Run Controls</h3>
          <input className="field" placeholder="Semester id (optional)" value={semesterInput} onChange={(e) => setSemesterInput(e.target.value)} />
          <input className="field" placeholder="Run id" value={runIdInput} onChange={(e) => setRunIdInput(e.target.value)} />
          <div className="btn-grid">
            <button className="btn" onClick={generateTimetable}>Generate</button>
            <button className="btn" onClick={validateRun}>Validate</button>
            <button className="btn" onClick={listRuns}>Runs</button>
            <button className="btn" onClick={() => loadRunTimetable(runIdInput)}>Load</button>
            <button className="btn btn-primary" onClick={publishRun}>Publish</button>
            <button className="btn" onClick={loadTimeslots}>Timeslots</button>
          </div>
        </div>

        {isAdminLike && (
          <div className="card">
            <h3>Admin Actions</h3>
            <input className="field" placeholder="Name" value={nameInput} onChange={(e) => setNameInput(e.target.value)} />
            <input className="field" placeholder="Dept id (faculty)" value={deptInput} onChange={(e) => setDeptInput(e.target.value)} />
            <div className="btn-grid two">
              <button className="btn" onClick={createDepartment}>Create Department</button>
              <button className="btn" onClick={createFaculty}>Create Faculty</button>
            </div>
            <button className="btn ghost" onClick={listDepartments}>List Departments</button>
          </div>
        )}
      </aside>

      <section className="main-panel">
        <div className="panel-header">
          <h2>Timetable Calendar</h2>
          <span className={`chip ${validation?.is_valid ? "ok" : "warn"}`}>{validation ? (validation.is_valid ? "No Conflicts" : "Conflicts Found") : "Validation Pending"}</span>
        </div>

        {isAdminLike && (
          <div className="card inline">
            <h3>Manual Override</h3>
            <select className="field" value={selectedAssignmentId} onChange={(e) => setSelectedAssignmentId(e.target.value)}>
              <option value="">Select assignment</option>
              {rows.map((r) => (
                <option key={r.assignment_id} value={r.assignment_id}>
                  #{r.assignment_id} {r.course} ({r.day} {r.time})
                </option>
              ))}
            </select>
            <select className="field" value={overrideTimeslotId} onChange={(e) => setOverrideTimeslotId(e.target.value)}>
              <option value="">Target timeslot</option>
              {timeslots.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.day} {t.slot}
                </option>
              ))}
            </select>
            <button className="btn btn-primary" onClick={overrideEntry}>Apply</button>
          </div>
        )}

        <div className="card table-card">
          <div className="table-wrap">
            <table className="schedule-table">
              <thead>
                <tr>
                  <th>Day / Slot</th>
                  {orderedSlots.map((slot) => <th key={slot}>{slot}</th>)}
                </tr>
              </thead>
              <tbody>
                {orderedDays.map((day) => (
                  <tr key={day}>
                    <td className="day-cell">{day}</td>
                    {orderedSlots.map((slot) => {
                      const key = `${day}__${slot}`;
                      const entry = cellMap.get(key);
                      const isConflict = conflictCells.has(key);
                      return (
                        <td key={key} className={isConflict ? "slot conflict" : "slot"}>
                          {entry ? (
                            <div className="entry">
                              <div className="entry-title">{entry.course}</div>
                              <div>{entry.faculty}</div>
                              <div>{entry.room}</div>
                              <div className="small">#{entry.assignment_id}</div>
                            </div>
                          ) : (
                            <span className="small">-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h3>Validation Details</h3>
          <pre className="json-box">{JSON.stringify(validation || { info: "Run validate to view conflicts" }, null, 2)}</pre>
        </div>
      </section>
    </main>
  );
}
