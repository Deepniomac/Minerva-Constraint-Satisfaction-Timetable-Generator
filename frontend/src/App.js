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
  const [departments, setDepartments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [auditRows, setAuditRows] = useState([]);
  const [runSummary, setRunSummary] = useState(null);
  const [timeslots, setTimeslots] = useState([]);
  const [validation, setValidation] = useState(null);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [overrideTimeslotId, setOverrideTimeslotId] = useState("");
  const [csvFile, setCsvFile] = useState(null);
  const [manualMode, setManualMode] = useState(false);
  const [manualCourses, setManualCourses] = useState([]);
  const [manualFaculty, setManualFaculty] = useState([]);
  const [manualRooms, setManualRooms] = useState([]);
  const [manualCourseId, setManualCourseId] = useState("");
  const [manualFacultyId, setManualFacultyId] = useState("");
  const [manualRoomId, setManualRoomId] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState([
    {
      role: "bot",
      text: "Hi, I am Minerva. Enter raw data commands and I will refine and add them. Example: add department CSE; add faculty Dr Rao dept CSE; add course Data Structures hours 3 dept CSE",
    },
  ]);
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
      setDepartments(res.data || []);
      setMessage(`Departments loaded (${(res.data || []).length}).`);
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

  async function loadNotifications() {
    try {
      const res = await axios.get(`${API_BASE}/notifications/`, { headers: authHeaders });
      setNotifications(res.data || []);
      setMessage(`Notifications loaded (${(res.data || []).length}).`);
    } catch (error) {
      setMessage(error?.response?.data?.detail || "Failed to load notifications");
    }
  }

  async function loadAudit() {
    try {
      const res = await axios.get(`${API_BASE}/audit/?limit=100`, { headers: authHeaders });
      setAuditRows(res.data || []);
      setMessage(`Audit logs loaded (${(res.data || []).length}).`);
    } catch (error) {
      setMessage(error?.response?.data?.detail || "Failed to load audit logs");
    }
  }

  async function loadRunSummary() {
    try {
      if (!runIdInput) return setMessage("Enter run id for summary.");
      const res = await axios.get(`${API_BASE}/reports/run-summary?run_id=${encodeURIComponent(runIdInput)}`, { headers: authHeaders });
      setRunSummary(res.data);
      setMessage("Run summary loaded.");
    } catch (error) {
      setMessage(error?.response?.data?.detail || "Failed to load run summary");
    }
  }

  function downloadRunCsv() {
    if (!runIdInput) return setMessage("Enter run id for CSV export.");
    window.open(`${API_BASE}/reports/run-export.csv?run_id=${encodeURIComponent(runIdInput)}`, "_blank");
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

  async function loadManualResources() {
    try {
      const res = await axios.get(`${API_BASE}/timetable/manual/resources`, { headers: authHeaders });
      setManualCourses(res.data.courses || []);
      setManualFaculty(res.data.faculty || []);
      setManualRooms(res.data.rooms || []);
      setMessage("Manual resources loaded.");
    } catch (error) {
      setMessage(error?.response?.data?.detail || "Failed to load manual resources");
    }
  }

  async function startManualRun() {
    try {
      const qs = semesterInput ? `?semester_id=${encodeURIComponent(semesterInput)}` : "";
      const res = await axios.post(`${API_BASE}/timetable/manual/start${qs}`, {}, { headers: authHeaders });
      setRunIdInput(String(res.data.run_id || ""));
      await loadRunTimetable(res.data.run_id);
      setMessage(`Manual run started: #${res.data.run_id}`);
    } catch (error) {
      setMessage(error?.response?.data?.detail || error?.response?.data?.error || "Failed to start manual run");
    }
  }

  async function assignManualToTimeslot(timeslotId) {
    try {
      if (!runIdInput) return setMessage("Start or select a run first.");
      if (!manualCourseId || !manualFacultyId || !manualRoomId) {
        return setMessage("Select course, faculty, and room before dropping.");
      }
      const url = `${API_BASE}/timetable/manual/assign?run_id=${encodeURIComponent(runIdInput)}&course_id=${encodeURIComponent(manualCourseId)}&faculty_id=${encodeURIComponent(manualFacultyId)}&room_id=${encodeURIComponent(manualRoomId)}&timeslot_id=${encodeURIComponent(timeslotId)}`;
      const res = await axios.post(url, {}, { headers: authHeaders });
      setValidation(res.data.validation || null);
      await loadRunTimetable(runIdInput);
      setMessage("Manual assignment applied.");
    } catch (error) {
      setMessage(error?.response?.data?.detail || error?.response?.data?.error || "Manual assignment failed");
    }
  }

  async function sendMinervaMessage() {
    const text = chatInput.trim();
    if (!text) return;
    setChatHistory((prev) => [...prev, { role: "user", text }]);
    setChatInput("");
    try {
      const res = await axios.post(
        `${API_BASE}/chatbot/minerva`,
        { message: text, apply: true },
        { headers: authHeaders }
      );
      const payload = JSON.stringify(res.data, null, 2);
      setChatHistory((prev) => [...prev, { role: "bot", text: payload }]);
      setMessage("Minerva processed your request.");
      await Promise.all([listDepartments(), loadManualResources()]);
    } catch (error) {
      const detail = error?.response?.data?.detail || "Minerva request failed";
      setChatHistory((prev) => [...prev, { role: "bot", text: String(detail) }]);
      setMessage(String(detail));
    }
  }

  async function uploadSubjectsCsv() {
    try {
      if (!csvFile) return setMessage("Select a CSV file first.");
      const formData = new FormData();
      formData.append("file", csvFile);
      const res = await axios.post(`${API_BASE}/imports/subjects-csv`, formData, {
        headers: {
          ...authHeaders,
          "Content-Type": "multipart/form-data",
        },
      });
      setMessage(`CSV imported: rows=${res.data.rows_processed}, courses=${res.data.courses_created}, faculty=${res.data.faculty_created}, rooms=${res.data.rooms_created}`);
      setCsvFile(null);
    } catch (error) {
      setMessage(error?.response?.data?.detail || "CSV upload failed");
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
  const orderedDays = useMemo(() => {
    const fromRows = rows.map((r) => r.day).filter(Boolean);
    const fromSlots = timeslots.map((t) => t.day).filter(Boolean);
    return Array.from(new Set([...fromRows, ...fromSlots])).sort((a, b) => (dayOrder.indexOf(a) === -1 ? 99 : dayOrder.indexOf(a)) - (dayOrder.indexOf(b) === -1 ? 99 : dayOrder.indexOf(b)));
  }, [rows, timeslots]);
  const orderedSlots = useMemo(() => {
    const fromRows = rows.map((r) => r.time).filter(Boolean);
    const fromSlots = timeslots.map((t) => t.slot).filter(Boolean);
    return Array.from(new Set([...fromRows, ...fromSlots])).sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
  }, [rows, timeslots]);
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
            <button className={`btn ${manualMode ? "btn-primary" : ""}`} onClick={() => setManualMode((v) => !v)}>
              {manualMode ? "Manual Mode ON" : "Manual Mode"}
            </button>
            <button className="btn" onClick={generateTimetable}>Generate</button>
            <button className="btn" onClick={startManualRun}>Start Manual Run</button>
            <button className="btn" onClick={loadManualResources}>Manual Resources</button>
            <button className="btn" onClick={validateRun}>Validate</button>
            <button className="btn" onClick={listRuns}>Runs</button>
            <button className="btn" onClick={() => loadRunTimetable(runIdInput)}>Load</button>
            <button className="btn btn-primary" onClick={publishRun}>Publish</button>
            <button className="btn" onClick={loadTimeslots}>Timeslots</button>
            <button className="btn" onClick={loadNotifications}>Notifications</button>
            <button className="btn" onClick={loadAudit}>Audit</button>
            <button className="btn" onClick={loadRunSummary}>Summary</button>
            <button className="btn" onClick={downloadRunCsv}>CSV</button>
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
            <button className="btn ghost full" onClick={listDepartments}>List Departments</button>
            {departments.length > 0 && (
              <div className="list-box">
                {departments.map((d) => (
                  <div key={d.id} className="list-item">
                    <span>#{d.id}</span>
                    <span>{d.name}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="csv-upload-box">
              <label className="small">Import Subjects CSV</label>
              <input
                className="field"
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
              />
              <button className="btn" onClick={uploadSubjectsCsv}>Upload CSV</button>
            </div>
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

        {isAdminLike && manualMode && (
          <div className="card inline-manual">
            <h3>Manual Drag Assign</h3>
            <select className="field" value={manualCourseId} onChange={(e) => setManualCourseId(e.target.value)}>
              <option value="">Course</option>
              {manualCourses.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <select className="field" value={manualFacultyId} onChange={(e) => setManualFacultyId(e.target.value)}>
              <option value="">Faculty</option>
              {manualFaculty.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            <select className="field" value={manualRoomId} onChange={(e) => setManualRoomId(e.target.value)}>
              <option value="">Room</option>
              {manualRooms.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            <div
              className="drag-card"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", "manual-assign");
              }}
            >
              Drag this card to a timetable slot
            </div>
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
                        <td
                          key={key}
                          className={isConflict ? "slot conflict" : "slot"}
                          onDragOver={(e) => {
                            if (manualMode) e.preventDefault();
                          }}
                          onDrop={async (e) => {
                            if (!manualMode) return;
                            e.preventDefault();
                            const ts = timeslots.find((t) => t.day === day && String(t.slot) === String(slot));
                            if (ts) await assignManualToTimeslot(ts.id);
                          }}
                        >
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

        <div className="card">
          <h3>Run Summary</h3>
          <pre className="json-box">{JSON.stringify(runSummary || { info: "Load Summary to view run metrics" }, null, 2)}</pre>
        </div>

        <div className="card">
          <h3>Notifications</h3>
          <pre className="json-box">{JSON.stringify(notifications, null, 2)}</pre>
        </div>

        <div className="card">
          <h3>Audit Logs</h3>
          <pre className="json-box">{JSON.stringify(auditRows, null, 2)}</pre>
        </div>
      </section>

      <button className="minerva-fab" onClick={() => setChatOpen((v) => !v)}>
        {chatOpen ? "Close Minerva" : "Minerva Chat"}
      </button>

      {chatOpen && (
        <div className="minerva-chat">
          <div className="minerva-chat-header">Minerva Assistant</div>
          <div className="minerva-chat-body">
            {chatHistory.map((m, idx) => (
              <div key={idx} className={`chat-msg ${m.role}`}>
                <pre>{m.text}</pre>
              </div>
            ))}
          </div>
          <div className="minerva-chat-input">
            <textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type raw data, e.g. add faculty Dr Snape dept CSE; add room 5A capacity 60"
            />
            <button className="btn btn-primary" onClick={sendMinervaMessage}>
              Send
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
