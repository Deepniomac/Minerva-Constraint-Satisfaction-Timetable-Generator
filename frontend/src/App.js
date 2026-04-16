import { useMemo, useState } from "react";
import axios from "axios";
import "./App.css";

const API_BASE = "http://127.0.0.1:8000";

export default function App() {
  const roleToPage = {
    admin: "admin",
    department_head: "admin",
    faculty: "faculty",
    student: "student",
  };
  const [activePage, setActivePage] = useState(roleToPage[localStorage.getItem("role")] || "home");
  const [username, setUsername] = useState(localStorage.getItem("username") || "");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [role, setRole] = useState(localStorage.getItem("role") || "");
  const [registerUsername, setRegisterUsername] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerRole, setRegisterRole] = useState("student");
  const [message, setMessage] = useState("Login to manage timetables.");
  const [nameInput, setNameInput] = useState("");
  const [deptInput, setDeptInput] = useState("");
  const [semesterInput, setSemesterInput] = useState("");
  const [runIdInput, setRunIdInput] = useState("");
  const [rows, setRows] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [facultyList, setFacultyList] = useState([]);
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
  const [manualSections, setManualSections] = useState([]);
  const [manualCourseId, setManualCourseId] = useState("");
  const [manualFacultyId, setManualFacultyId] = useState("");
  const [manualRoomId, setManualRoomId] = useState("");
  const [manualSectionId, setManualSectionId] = useState("");
  const [resourceTitle, setResourceTitle] = useState("");
  const [resourceCategory, setResourceCategory] = useState("notes");
  const [resourceContent, setResourceContent] = useState("");
  const [resources, setResources] = useState([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatPreviewText, setChatPreviewText] = useState("");
  const [dashboard, setDashboard] = useState(null);
  const [chatHistory, setChatHistory] = useState([
    {
      role: "bot",
      text: "Hi, I am Minerva. Enter raw data commands and I will refine and add them. Example: add department CSE; add faculty Dr Rao dept CSE; add course Data Structures hours 3 dept CSE",
    },
  ]);
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  function formatMinervaResponse(data) {
    if (!data || typeof data !== "object") return "Minerva completed the request.";

    const lines = [];
    const actions = Array.isArray(data.actions) ? data.actions : [];
    const stats = data.stats && typeof data.stats === "object" ? data.stats : {};
    const unknown = Array.isArray(data.unknown) ? data.unknown : [];

    if (actions.length > 0) {
      lines.push("Completed actions:");
      actions.forEach((a) => {
        if (a.type === "department") {
          if (a.created) lines.push(`- Department added: ${a.name}`);
          else if (a.deleted) lines.push(`- Department deleted: ${a.name}`);
          else lines.push(`- Department updated: ${a.name}`);
          return;
        }
        if (a.type === "faculty") {
          if (a.created) lines.push(`- Faculty added: ${a.name}${a.dept ? ` (Dept: ${a.dept})` : ""}`);
          else if (a.deleted) lines.push(`- Faculty deleted: ${a.name}`);
          else lines.push(`- Faculty updated: ${a.name}`);
          return;
        }
        if (a.type === "course") {
          if (a.created) lines.push(`- Course added: ${a.name}${a.hours ? ` (${a.hours} hrs/week)` : ""}`);
          else if (a.deleted) lines.push(`- Course deleted: ${a.name}`);
          else lines.push(`- Course updated: ${a.name}`);
          return;
        }
        if (a.type === "room") {
          if (a.created) lines.push(`- Room added: ${a.name}`);
          else if (a.deleted) lines.push(`- Room deleted: ${a.name}`);
          else lines.push(`- Room updated: ${a.name}`);
          return;
        }
        if (a.type === "section") {
          if (a.created) lines.push(`- Section added: ${a.name}`);
          else if (a.deleted) lines.push(`- Section deleted: ${a.name}`);
          else lines.push(`- Section updated: ${a.name}`);
          return;
        }
        if (a.type === "faculty_course_map") {
          if (a.created) lines.push(`- Mapping added: ${a.faculty} -> ${a.course}`);
          else if (a.deleted) lines.push(`- Mapping removed: ${a.faculty} -> ${a.course}`);
          return;
        }
        lines.push("- Request applied.");
      });
    }

    const statEntries = Object.entries(stats).filter(([, v]) => Number(v) > 0);
    if (statEntries.length > 0) {
      lines.push("");
      lines.push("Summary:");
      statEntries.forEach(([k, v]) => {
        lines.push(`- ${k.replaceAll("_", " ")}: ${v}`);
      });
    }

    if (unknown.length > 0) {
      lines.push("");
      lines.push("Not applied:");
      unknown.forEach((u) => {
        const cmd = u?.line ? `"${u.line}"` : "A command";
        lines.push(`- ${cmd}: ${u?.reason || "Could not process"}`);
      });
    }

    if (lines.length === 0 && data.mode === "csv" && data.result) {
      const r = data.result;
      lines.push("CSV import completed.");
      if (r.rows_processed) lines.push(`- Rows processed: ${r.rows_processed}`);
      if (r.courses_created) lines.push(`- Courses created: ${r.courses_created}`);
      if (r.faculty_created) lines.push(`- Faculty created: ${r.faculty_created}`);
      if (r.rooms_created) lines.push(`- Rooms created: ${r.rooms_created}`);
    }

    if (data.applied === false) {
      lines.unshift("Preview only: no database changes were committed.", "");
    }

    return lines.length > 0 ? lines.join("\n") : "Minerva completed the request.";
  }

  function formatValidationText(data) {
    if (!data) return "Run Validate to view conflict checks.";
    const lines = [];
    lines.push(data.is_valid ? "Validation passed. No hard conflicts found." : "Validation found hard conflicts.");
    const conflicts = Array.isArray(data.conflicts) ? data.conflicts : [];
    if (conflicts.length === 0) {
      lines.push("- No conflict entries.");
      return lines.join("\n");
    }
    lines.push(`- Total conflicts: ${conflicts.length}`);
    conflicts.forEach((c, idx) => {
      const type = String(c.type || "conflict").replaceAll("_", " ");
      const day = c.day || "-";
      const slot = c.slot || "-";
      lines.push(`${idx + 1}. ${type} at ${day} ${slot}`);
    });
    return lines.join("\n");
  }

  function formatRunSummaryText(data) {
    if (!data) return "Load Summary to view run metrics.";
    const lines = ["Run summary:"];
    Object.entries(data).forEach(([key, value]) => {
      lines.push(`- ${key.replaceAll("_", " ")}: ${value}`);
    });
    return lines.join("\n");
  }

  function formatNotificationsText(items) {
    if (!Array.isArray(items) || items.length === 0) return "No notifications available.";
    const lines = [`Total notifications: ${items.length}`];
    items.forEach((n, idx) => {
      const title = n.title || "Untitled";
      const msg = n.message || "";
      const kind = n.kind || "info";
      lines.push(`${idx + 1}. [${kind}] ${title} - ${msg}`);
    });
    return lines.join("\n");
  }

  function formatAuditText(items) {
    if (!Array.isArray(items) || items.length === 0) return "No audit logs available.";
    const lines = [`Total audit entries: ${items.length}`];
    items.forEach((a, idx) => {
      const actor = a.actor_username || "system";
      const roleText = a.actor_role ? ` (${a.actor_role})` : "";
      const action = a.action || "action";
      const entity = a.entity_type || "entity";
      const entityId = a.entity_id ? ` #${a.entity_id}` : "";
      lines.push(`${idx + 1}. ${actor}${roleText} -> ${action} on ${entity}${entityId}`);
    });
    return lines.join("\n");
  }

  async function login() {
    try {
      const res = await axios.post(`${API_BASE}/login?username=${username}&password=${password}`);
      localStorage.setItem("token", res.data.access_token);
      localStorage.setItem("role", res.data.role);
      localStorage.setItem("username", res.data.username);
      setToken(res.data.access_token);
      setRole(res.data.role);
      setActivePage(roleToPage[res.data.role] || "home");
      setMessage(`Logged in as ${res.data.username} (${res.data.role})`);
      await loadDashboard();
      await loadResources();
    } catch (error) {
      setMessage(error?.response?.data?.detail || "Login failed");
    }
  }

  async function register() {
    try {
      if (!registerUsername.trim() || !registerPassword.trim()) {
        return setMessage("Enter username and password to register.");
      }
      await axios.post(
        `${API_BASE}/register?username=${encodeURIComponent(registerUsername.trim())}&password=${encodeURIComponent(registerPassword)}&role=${encodeURIComponent(registerRole)}`
      );
      setUsername(registerUsername.trim());
      setPassword(registerPassword);
      setMessage(`Account created for ${registerUsername.trim()} as ${registerRole}. You can now sign in.`);
      setRegisterUsername("");
      setRegisterPassword("");
      setRegisterRole("student");
    } catch (error) {
      setMessage(error?.response?.data?.detail || "Registration failed");
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

  async function listFaculty() {
    try {
      const res = await axios.get(`${API_BASE}/faculty/`, { headers: authHeaders });
      setFacultyList(res.data || []);
      setMessage(`Faculty loaded (${(res.data || []).length}).`);
    } catch (error) {
      setMessage(error?.response?.data?.detail || "Failed to load faculty");
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

  async function loadDashboard() {
    try {
      const [runsRes, notifRes, deptRes, facultyRes] = await Promise.all([
        axios.get(`${API_BASE}/timetable/runs`, { headers: authHeaders }),
        axios.get(`${API_BASE}/notifications/`, { headers: authHeaders }),
        axios.get(`${API_BASE}/departments/`, { headers: authHeaders }),
        axios.get(`${API_BASE}/faculty/`, { headers: authHeaders }),
      ]);
      const runs = runsRes.data || [];
      const notificationsList = notifRes.data || [];
      setDashboard({
        totalRuns: runs.length,
        publishedRuns: runs.filter((r) => r.status === "published").length,
        draftRuns: runs.filter((r) => r.status === "draft").length,
        notifications: notificationsList.length,
        unreadNotifications: notificationsList.filter((n) => !n.is_read).length,
        departments: (deptRes.data || []).length,
        faculty: (facultyRes.data || []).length,
      });
    } catch (_error) {
      setDashboard(null);
    }
  }

  async function loadResources() {
    try {
      const res = await axios.get(`${API_BASE}/resources/`, { headers: authHeaders });
      setResources(res.data || []);
      setMessage(`Resources loaded (${(res.data || []).length}).`);
    } catch (error) {
      setMessage(error?.response?.data?.detail || "Failed to load resources");
    }
  }

  async function createResource() {
    try {
      if (!resourceTitle.trim() || !resourceContent.trim()) {
        return setMessage("Enter title and content for resource.");
      }
      await axios.post(
        `${API_BASE}/resources/public`,
        {
          title: resourceTitle.trim(),
          category: resourceCategory,
          content: resourceContent.trim(),
        },
        { headers: authHeaders }
      );
      setMessage("Resource published.");
      setResourceTitle("");
      setResourceContent("");
      setResourceCategory("notes");
      await loadResources();
    } catch (error) {
      setMessage(error?.response?.data?.detail || "Failed to publish resource");
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
      if (res.data?.error) {
        return setMessage(`Generate failed: ${res.data.error}`);
      }
      if (!res.data?.run_id) {
        return setMessage("Generate failed: missing run id in response. Please verify semesters/rooms/timeslots.");
      }
      setRunIdInput(String(res.data.run_id || ""));
      await loadRunTimetable(res.data.run_id);
      setValidation(res.data.validation || null);
      setMessage(`${res.data.message || "Draft timetable generated"} | run=${res.data.run_id} | version=${res.data.version ?? "-"}`);
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
      setManualSections(res.data.sections || []);
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
      if (!manualCourseId || !manualFacultyId || !manualRoomId || !manualSectionId) {
        return setMessage("Select course, faculty, room, and section before dropping.");
      }
      const url = `${API_BASE}/timetable/manual/assign?run_id=${encodeURIComponent(runIdInput)}&course_id=${encodeURIComponent(manualCourseId)}&faculty_id=${encodeURIComponent(manualFacultyId)}&room_id=${encodeURIComponent(manualRoomId)}&section_id=${encodeURIComponent(manualSectionId)}&timeslot_id=${encodeURIComponent(timeslotId)}`;
      const res = await axios.post(url, {}, { headers: authHeaders });
      setValidation(res.data.validation || null);
      await loadRunTimetable(runIdInput);
      setMessage("Manual assignment applied.");
    } catch (error) {
      setMessage(error?.response?.data?.detail || error?.response?.data?.error || "Manual assignment failed");
    }
  }

  async function sendMinervaMessage(applyChanges) {
    const text = (applyChanges ? (chatPreviewText || chatInput) : chatInput).trim();
    if (!text) return;
    setChatHistory((prev) => [...prev, { role: "user", text: applyChanges ? `Confirm apply: ${text}` : text }]);
    if (!applyChanges) {
      setChatInput("");
      setChatPreviewText(text);
    }
    try {
      const res = await axios.post(
        `${API_BASE}/chatbot/minerva`,
        { message: text, apply: applyChanges },
        { headers: authHeaders }
      );
      const payload = formatMinervaResponse(res.data);
      setChatHistory((prev) => [...prev, { role: "bot", text: payload }]);
      setMessage(applyChanges ? "Minerva applied your request." : "Minerva preview generated. Click Apply Preview.");
      await Promise.all([listDepartments(), loadManualResources()]);
      if (applyChanges) setChatPreviewText("");
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
  const isFacultyLike = role === "faculty" || isAdminLike;
  const isLoggedIn = Boolean(token);
  const rolePages = {
    admin: ["home", "admin", "faculty", "student", "resources"],
    department_head: ["home", "admin", "faculty", "student", "resources"],
    faculty: ["home", "faculty", "student", "resources"],
    student: ["home", "student", "resources"],
  };
  const allowedPages = isLoggedIn ? (rolePages[role] || ["home"]) : ["home"];

  function setPage(page) {
    if (!allowedPages.includes(page)) return;
    setActivePage(page);
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("username");
    setToken("");
    setRole("");
    setActivePage("home");
      setMessage("Logged out.");
    setDashboard(null);
      setResources([]);
  }
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
    <main className="site-shell">
      <header className="top-nav">
        <div className="brand">Minerva</div>
        <div className="nav-links">
          {allowedPages.includes("home") && <button className={`btn ${activePage === "home" ? "btn-primary" : ""}`} onClick={() => setPage("home")}>Home</button>}
          {allowedPages.includes("student") && <button className={`btn ${activePage === "student" ? "btn-primary" : ""}`} onClick={() => setPage("student")}>Student</button>}
          {allowedPages.includes("faculty") && <button className={`btn ${activePage === "faculty" ? "btn-primary" : ""}`} onClick={() => setPage("faculty")}>Faculty</button>}
          {allowedPages.includes("admin") && <button className={`btn ${activePage === "admin" ? "btn-primary" : ""}`} onClick={() => setPage("admin")}>Admin</button>}
          {allowedPages.includes("resources") && <button className={`btn ${activePage === "resources" ? "btn-primary" : ""}`} onClick={() => setPage("resources")}>Resources</button>}
          {isLoggedIn && <button className="btn" onClick={logout}>Logout</button>}
        </div>
      </header>
      <div className="app-shell">
      <aside className="left-panel">
        <h1>{activePage[0].toUpperCase() + activePage.slice(1)} Portal</h1>
        <p className="muted">Project Details & Schedule</p>
        <div className="status-pill">{message}</div>

        {!isLoggedIn && (
          <>
            <div className="card">
              <h3>Sign In</h3>
              <input className="field" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
              <input className="field" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
              <button className="btn btn-primary" onClick={login}>Sign In</button>
            </div>

            <div className="card">
              <h3>Create Account</h3>
              <input
                className="field"
                placeholder="New username"
                value={registerUsername}
                onChange={(e) => setRegisterUsername(e.target.value)}
              />
              <input
                className="field"
                type="password"
                placeholder="New password"
                value={registerPassword}
                onChange={(e) => setRegisterPassword(e.target.value)}
              />
              <select className="field" value={registerRole} onChange={(e) => setRegisterRole(e.target.value)}>
                <option value="student">student</option>
                <option value="faculty">faculty</option>
                <option value="department_head">department_head</option>
                <option value="admin">admin</option>
              </select>
              <p className="small">Choose role and create account. Credentials are stored securely in backend DB.</p>
              <button className="btn" onClick={register}>Create Account</button>
            </div>
          </>
        )}

        {isLoggedIn && activePage === "student" && (
        <div className="card">
          <h3>Student Controls</h3>
          <input
            className="field"
            placeholder="Run id (required for load/summary/csv)"
            value={runIdInput}
            onChange={(e) => setRunIdInput(e.target.value)}
          />
          <p className="small">
            Use Load to view timetable for a run. Validate shows conflict report, and Summary/CSV help with review/download.
          </p>
          <div className="btn-grid two">
            <button className="btn" title="Load timetable entries for the entered Run ID." onClick={() => loadRunTimetable(runIdInput)}>
              Load Timetable
            </button>
            <button className="btn" title="Validate selected run for hard conflicts." onClick={validateRun}>
              Validate
            </button>
            <button className="btn" title="Load notifications for current user." onClick={loadNotifications}>
              Notifications
            </button>
            <button className="btn" title="Load summary metrics for entered run id." onClick={loadRunSummary}>
              Summary
            </button>
            <button className="btn" title="Download timetable as CSV for entered run id." onClick={downloadRunCsv}>
              CSV
            </button>
            <button className="btn" title="Load timeslot definitions to improve timetable visibility." onClick={loadTimeslots}>
              Timeslots
            </button>
          </div>
        </div>
        )}

        {isLoggedIn && (activePage === "faculty" || activePage === "admin") && (
        <div className="card">
          <h3>Run Controls</h3>
          <input className="field" placeholder="Semester id (optional)" value={semesterInput} onChange={(e) => setSemesterInput(e.target.value)} />
          <input className="field" placeholder="Run id" value={runIdInput} onChange={(e) => setRunIdInput(e.target.value)} />
          <p className="small">
            Quick guide: Generate/Start Manual Run to create a run, then Load/Validate/Publish. Use Timeslots, Runs, Summary, CSV, Notifications, and Audit for inspection.
          </p>
          <div className="btn-grid">
            <button
              className={`btn ${manualMode ? "btn-primary" : ""}`}
              title="Enable manual drag-and-drop scheduling mode. Turn this on before dropping course assignments into timetable cells."
              onClick={() => setManualMode((v) => !v)}
            >
              {manualMode ? "Manual Mode ON" : "Manual Mode"}
            </button>
            <button
              className="btn"
              title="Auto-generate a timetable run using the scheduling algorithm. Optionally uses Semester ID."
              onClick={generateTimetable}
            >
              Generate
            </button>
            <button
              className="btn"
              title="Create a new draft run for manual planning. Use this before drag-and-drop assignment."
              onClick={startManualRun}
            >
              Start Manual Run
            </button>
            <button
              className="btn"
              title="Load available courses, faculty, and rooms required for manual assignment."
              onClick={loadManualResources}
            >
              Manual Resources
            </button>
            <button
              className="btn"
              title="Check current run for hard conflicts (faculty overlap, room overlap, section/room slot clashes)."
              onClick={validateRun}
            >
              Validate
            </button>
            <button
              className="btn"
              title="List all timetable runs with status/version so you can pick a run id."
              onClick={listRuns}
            >
              Runs
            </button>
            <button
              className="btn"
              title="Load timetable entries for the entered Run ID into the calendar."
              onClick={() => loadRunTimetable(runIdInput)}
            >
              Load
            </button>
            <button
              className="btn btn-primary"
              title="Publish the selected run after successful validation. Published runs are considered final."
              onClick={publishRun}
            >
              Publish
            </button>
            <button
              className="btn"
              title="Load all available day/slot combinations from backend for scheduling and overrides."
              onClick={loadTimeslots}
            >
              Timeslots
            </button>
            <button
              className="btn"
              title="Fetch user and broadcast notifications related to timetable activity."
              onClick={loadNotifications}
            >
              Notifications
            </button>
            <button
              className="btn"
              title="View audit logs showing who changed what and when."
              onClick={loadAudit}
            >
              Audit
            </button>
            <button
              className="btn"
              title="Get run-level metrics like assignment counts and conflict stats."
              onClick={loadRunSummary}
            >
              Summary
            </button>
            <button
              className="btn"
              title="Download selected run timetable as a CSV file for reporting or sharing."
              onClick={downloadRunCsv}
            >
              CSV
            </button>
          </div>
        </div>
        )}

        {isLoggedIn && isAdminLike && activePage === "admin" && (
          <div className="card">
            <h3>Admin Actions</h3>
            <input className="field" placeholder="Name" value={nameInput} onChange={(e) => setNameInput(e.target.value)} />
            <input className="field" placeholder="Dept id (faculty)" value={deptInput} onChange={(e) => setDeptInput(e.target.value)} />
            <div className="btn-grid two">
              <button className="btn" onClick={createDepartment}>Create Department</button>
              <button className="btn" onClick={createFaculty}>Create Faculty</button>
            </div>
            <div className="btn-grid two">
              <button className="btn ghost full" onClick={listDepartments}>List Departments</button>
              <button className="btn ghost full" onClick={listFaculty}>List Faculty</button>
            </div>
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
            {facultyList.length > 0 && (
              <div className="list-box">
                {facultyList.map((f) => (
                  <div key={f.id} className="list-item">
                    <span>#{f.id}</span>
                    <span>{f.name}</span>
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
        {activePage === "home" && (
          <div className="card">
            <h2>Welcome to Minerva</h2>
            <p className="muted">
              Use Student page to view timetable, Faculty page to generate/manage runs,
              and Admin page for setup/import actions.
            </p>
            {isLoggedIn && (
              <>
                <button className="btn" onClick={loadDashboard}>Refresh Dashboard</button>
                <div className="btn-grid two" style={{ marginTop: 10 }}>
                  <div className="status-pill">Runs: {dashboard?.totalRuns ?? "-"}</div>
                  <div className="status-pill">Published: {dashboard?.publishedRuns ?? "-"}</div>
                  <div className="status-pill">Drafts: {dashboard?.draftRuns ?? "-"}</div>
                  <div className="status-pill">Notifications: {dashboard?.notifications ?? "-"}</div>
                  <div className="status-pill">Unread: {dashboard?.unreadNotifications ?? "-"}</div>
                  <div className="status-pill">Departments / Faculty: {dashboard ? `${dashboard.departments} / ${dashboard.faculty}` : "-"}</div>
                </div>
              </>
            )}
          </div>
        )}

        {activePage === "resources" && (
          <>
            <div className="panel-header">
              <h2>Academic Resource Hub</h2>
              <span className="chip ok">Student Accessible</span>
            </div>
            <div className="card">
              <p className="small">Students can read all public academic resources. Confidential material is backend/manual only.</p>
              <button className="btn" onClick={loadResources}>Refresh Resources</button>
            </div>
            {isFacultyLike && (
              <div className="card">
                <h3>Publish Resource (Faculty/Admin)</h3>
                <input className="field" placeholder="Title (e.g., Unit 2 Notes)" value={resourceTitle} onChange={(e) => setResourceTitle(e.target.value)} />
                <select className="field" value={resourceCategory} onChange={(e) => setResourceCategory(e.target.value)}>
                  <option value="notes">notes</option>
                  <option value="curriculum">curriculum</option>
                  <option value="announcement">announcement</option>
                  <option value="reference">reference</option>
                </select>
                <textarea
                  className="field"
                  placeholder="Paste syllabus, notes, topics, or reading guidance..."
                  value={resourceContent}
                  onChange={(e) => setResourceContent(e.target.value)}
                  rows={6}
                />
                <button className="btn btn-primary" onClick={createResource}>Publish Public Resource</button>
              </div>
            )}
            <div className="card">
              <h3>Published Resources</h3>
              {resources.length === 0 ? (
                <p className="small">No resources yet. Faculty/Admin can publish from this page.</p>
              ) : (
                <div className="list-box">
                  {resources.map((r) => (
                    <div key={r.id} className="list-item resource-item">
                      <div>
                        <div><strong>{r.title}</strong> <span className="small">[{r.category}]</span></div>
                        <div className="small">By {r.uploaded_by_username || "faculty/admin"} ({r.uploaded_by_role || "role"})</div>
                        <div>{r.content}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {(activePage === "student" || activePage === "faculty" || activePage === "admin") && (
          <>
        <div className="panel-header">
          <h2>Timetable Calendar</h2>
          <span className={`chip ${validation?.is_valid ? "ok" : "warn"}`}>{validation ? (validation.is_valid ? "No Conflicts" : "Conflicts Found") : "Validation Pending"}</span>
        </div>

        {isAdminLike && (activePage === "faculty" || activePage === "admin") && (
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

        {isAdminLike && manualMode && (activePage === "faculty" || activePage === "admin") && (
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
            <select className="field" value={manualSectionId} onChange={(e) => setManualSectionId(e.target.value)}>
              <option value="">Section</option>
              {manualSections.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
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
                              <div>{entry.section || "-"}</div>
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
          <p className="small">Shows hard conflict results for the selected run.</p>
          <pre className="json-box">{formatValidationText(validation)}</pre>
        </div>

        <div className="card">
          <h3>Run Summary</h3>
          <p className="small">Displays run-level metrics and totals.</p>
          <pre className="json-box">{formatRunSummaryText(runSummary)}</pre>
        </div>

        <div className="card">
          <h3>Notifications</h3>
          <p className="small">Recent alerts and system messages for your user.</p>
          <pre className="json-box">{formatNotificationsText(notifications)}</pre>
        </div>

        {activePage !== "student" && (
          <div className="card">
            <h3>Audit Logs</h3>
            <p className="small">Tracks who performed which action in the system.</p>
            <pre className="json-box">{formatAuditText(auditRows)}</pre>
          </div>
        )}
          </>
        )}
      </section>
      </div>

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
            <button className="btn" title="Preview command changes without writing to DB." onClick={() => sendMinervaMessage(false)}>
              Preview
            </button>
            <button
              className="btn btn-primary"
              title="Apply the latest previewed command to DB."
              onClick={() => sendMinervaMessage(true)}
              disabled={!chatPreviewText && !chatInput.trim()}
            >
              Apply Preview
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
