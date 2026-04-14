import { useState } from "react";
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
      setRows(res.data);
      setMessage(`${res.data.message} | run=${res.data.run_id} | version=${res.data.version}`);
    } catch (error) {
      setMessage(error?.response?.data?.detail || error?.response?.data?.error || "Generation failed");
    }
  }

  async function validateRun() {
    try {
      const qs = runIdInput ? `?run_id=${encodeURIComponent(runIdInput)}` : "";
      const res = await axios.post(`${API_BASE}/timetable/validate${qs}`, {}, { headers: authHeaders });
      setRows(res.data);
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

  const isAdminLike = role === "admin" || role === "department_head";

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 24, fontFamily: "Arial" }}>
      <h1>Minerva Phase 2 Console</h1>
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

      <section>
        <h3>Response Data</h3>
        <pre style={{ background: "#f5f5f5", padding: 12 }}>{JSON.stringify(rows, null, 2)}</pre>
      </section>
    </main>
  );
}
