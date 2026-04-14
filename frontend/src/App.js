import { useMemo, useState } from "react";
import axios from "axios";

const API_BASE = "http://127.0.0.1:8000";

export default function App() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [role, setRole] = useState(localStorage.getItem("role") || "");
  const [message, setMessage] = useState("Login to manage Phase 1 entities.");
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
      await axios.post(
        `${API_BASE}/faculty/?name=${encodeURIComponent(nameInput)}&dept_id=${encodeURIComponent(deptInput)}`,
        {},
        { headers: authHeaders }
      );
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
      if (!runIdInput) {
        setMessage("Enter run ID to publish.");
        return;
      }
      const res = await axios.post(`${API_BASE}/timetable/publish?run_id=${encodeURIComponent(runIdInput)}`, {}, { headers: authHeaders });
      setRows(res.data);
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
      if (!selectedAssignmentId || !overrideTimeslotId) {
        setMessage("Select assignment and target timeslot.");
        return;
      }
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
  const orderedDays = useMemo(() => {
    const unique = Array.from(new Set(rows.map((r) => r.day).filter(Boolean)));
    return unique.sort((a, b) => {
      const ia = dayOrder.indexOf(a);
      const ib = dayOrder.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
  }, [rows]);
  const orderedSlots = useMemo(() => {
    const unique = Array.from(new Set(rows.map((r) => r.time).filter(Boolean)));
    return unique.sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
  }, [rows]);
  const conflictCells = useMemo(() => {
    const map = new Set();
    const conflicts = validation?.conflicts || [];
    for (const c of conflicts) map.add(`${c.day}__${c.slot}`);
    return map;
  }, [validation]);
  const cellMap = useMemo(() => {
    const m = new Map();
    for (const r of rows) m.set(`${r.day}__${r.time}`, r);
    return m;
  }, [rows]);

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: 24, fontFamily: "Arial" }}>
      <h1>Minerva Phase 3 Console</h1>
      <p>{message}</p>

      <section style={{ marginBottom: 16 }}>
        <input placeholder="username" value={username} onChange={(e) => setUsername(e.target.value)} />
        <input
          style={{ marginLeft: 8 }}
          placeholder="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button style={{ marginLeft: 8 }} onClick={login}>
          Login
        </button>
      </section>

      <section style={{ marginBottom: 16 }}>
        <button onClick={listDepartments}>List Departments</button>
        <button style={{ marginLeft: 8 }} onClick={generateTimetable}>
          Generate Timetable
        </button>
        <button style={{ marginLeft: 8 }} onClick={validateRun}>
          Validate Run
        </button>
        <button style={{ marginLeft: 8 }} onClick={listRuns}>
          List Runs
        </button>
        <button style={{ marginLeft: 8 }} onClick={() => loadRunTimetable(runIdInput)}>
          Load Timetable
        </button>
        <button style={{ marginLeft: 8 }} onClick={publishRun}>
          Publish Run
        </button>
      </section>

      <section style={{ marginBottom: 16 }}>
        <input
          placeholder="semester id (optional for generate)"
          value={semesterInput}
          onChange={(e) => setSemesterInput(e.target.value)}
        />
        <input
          style={{ marginLeft: 8 }}
          placeholder="run id (for validate/publish)"
          value={runIdInput}
          onChange={(e) => setRunIdInput(e.target.value)}
        />
        <button style={{ marginLeft: 8 }} onClick={loadTimeslots}>
          Load Timeslots
        </button>
      </section>

      {isAdminLike && (
        <section style={{ marginBottom: 16 }}>
          <h3>Admin / Dept Head Actions</h3>
          <input placeholder="name" value={nameInput} onChange={(e) => setNameInput(e.target.value)} />
          <input
            style={{ marginLeft: 8 }}
            placeholder="dept id (for faculty)"
            value={deptInput}
            onChange={(e) => setDeptInput(e.target.value)}
          />
          <div style={{ marginTop: 8 }}>
            <button onClick={createDepartment}>Create Department</button>
            <button style={{ marginLeft: 8 }} onClick={createFaculty}>
              Create Faculty
            </button>
          </div>
        </section>
      )}

      {isAdminLike && (
        <section style={{ marginBottom: 16, border: "1px solid #ddd", padding: 12 }}>
          <h3>Manual Override</h3>
          <select value={selectedAssignmentId} onChange={(e) => setSelectedAssignmentId(e.target.value)}>
            <option value="">Select assignment</option>
            {rows.map((r) => (
              <option key={r.assignment_id} value={r.assignment_id}>
                #{r.assignment_id} {r.course} ({r.day} {r.time})
              </option>
            ))}
          </select>
          <select style={{ marginLeft: 8 }} value={overrideTimeslotId} onChange={(e) => setOverrideTimeslotId(e.target.value)}>
            <option value="">Target timeslot</option>
            {timeslots.map((t) => (
              <option key={t.id} value={t.id}>
                {t.day} {t.slot}
              </option>
            ))}
          </select>
          <button style={{ marginLeft: 8 }} onClick={overrideEntry}>
            Apply Override
          </button>
        </section>
      )}

      <section style={{ marginBottom: 16 }}>
        <h3>Conflict Summary</h3>
        <pre style={{ background: "#f5f5f5", padding: 12 }}>
          {JSON.stringify(validation || { info: "Run validate to view conflicts" }, null, 2)}
        </pre>
      </section>

      <section>
        <h3>Calendar View</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                <th style={{ border: "1px solid #ddd", padding: 8 }}>Day / Slot</th>
                {orderedSlots.map((slot) => (
                  <th key={slot} style={{ border: "1px solid #ddd", padding: 8 }}>
                    {slot}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orderedDays.map((day) => (
                <tr key={day}>
                  <td style={{ border: "1px solid #ddd", padding: 8, fontWeight: "bold" }}>{day}</td>
                  {orderedSlots.map((slot) => {
                    const key = `${day}__${slot}`;
                    const entry = cellMap.get(key);
                    const isConflict = conflictCells.has(key);
                    return (
                      <td
                        key={key}
                        style={{
                          border: "1px solid #ddd",
                          padding: 8,
                          minWidth: 160,
                          background: isConflict ? "#ffd6d6" : "#f9f9f9",
                        }}
                      >
                        {entry ? (
                          <div>
                            <div style={{ fontWeight: "bold" }}>{entry.course}</div>
                            <div>{entry.faculty}</div>
                            <div>{entry.room}</div>
                            <div style={{ fontSize: 12, color: "#666" }}>#{entry.assignment_id}</div>
                          </div>
                        ) : (
                          <span style={{ color: "#aaa" }}>-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
