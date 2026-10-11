(() => {
  "use strict";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const STORAGE_KEY = "injaz-task-manager-v1";
  const todayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  };
  const shiftDate = (days) => {
    const d = new Date(); d.setDate(d.getDate() + days);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  };
  const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2,7)}`;
  const seed = {
    projects: [
      {id:"p-site",name:"الموقع الشخصي",color:"purple"},
      {id:"p-store",name:"المتجر الإلكتروني",color:"blue"},
      {id:"p-learn",name:"التطوير والتعلّم",color:"green"}
    ],
    tasks: [
      {id:"t1",title:"مراجعة تصميم الصفحة الرئيسية",description:"التأكد من تناسق الألوان وتجربة المستخدم.",due:todayISO(),priority:"high",projectId:"p-site",status:"active",created:Date.now()-80000},
      {id:"t2",title:"كتابة وصف المنتجات الجديدة",description:"تجهيز أوصاف مختصرة وواضحة للمنتجات.",due:todayISO(),priority:"medium",projectId:"p-store",status:"active",created:Date.now()-70000},
      {id:"t3",title:"إنهاء صفحة من دورة JavaScript",description:"تطبيق المفاهيم الجديدة على مثال عملي.",due:shiftDate(1),priority:"low",projectId:"p-learn",status:"active",created:Date.now()-60000},
      {id:"t4",title:"تجهيز قائمة مهام الأسبوع",description:"تحديد أهم ثلاث أولويات لهذا الأسبوع.",due:shiftDate(-1),priority:"medium",projectId:"p-site",status:"completed",created:Date.now()-50000},
      {id:"t5",title:"اختبار الموقع على الهاتف",description:"فحص القوائم والأزرار على أحجام شاشات مختلفة.",due:shiftDate(2),priority:"high",projectId:"p-site",status:"active",created:Date.now()-40000}
    ]
  };
  let state = loadState();
  let currentView = "overview";
  let currentFilter = "all";
  let navFilter = null;
  let selectedProject = null;
  let toastTimer;

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.tasks) && Array.isArray(parsed.projects)) return parsed;
      }
    } catch (error) { console.warn("تعذر قراءة البيانات المحفوظة:", error); }
    return JSON.parse(JSON.stringify(seed));
  }
  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch (error) { showToast("تعذر حفظ البيانات. تحقق من مساحة المتصفح."); }
  }
  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  }
  function projectFor(id) { return state.projects.find(p => p.id === id); }
  function isLate(task) { return task.status !== "completed" && task.due && task.due < todayISO(); }
  function isToday(task) { return task.due === todayISO() && task.status !== "completed"; }
  function priorityLabel(priority) { return ({high:"عالية",medium:"متوسطة",low:"منخفضة"})[priority] || "متوسطة"; }
  function dateLabel(value) {
    if (!value) return "بلا موعد";
    if (value === todayISO()) return "اليوم";
    if (value === shiftDate(1)) return "غدًا";
    try { return new Intl.DateTimeFormat("ar", {day:"numeric",month:"short"}).format(new Date(value+"T12:00:00")); }
    catch { return value; }
  }
  function showToast(message) {
    const toast = $("#toast"); toast.textContent = message; toast.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
  }
  function updateDate() {
    const d = new Date();
    $("#currentDate").textContent = new Intl.DateTimeFormat("ar", {weekday:"long",day:"numeric",month:"long",year:"numeric"}).format(d);
  }
  function render() {
    updateDate(); renderNavigation(); renderStats(); renderTasks(); renderProjects(); updateProgress();
  }
  function renderNavigation() {
    $("#navTaskCount").textContent = state.tasks.filter(t => t.status !== "completed").length;
    $("#projectNav").innerHTML = state.projects.map(p => {
      const count = state.tasks.filter(t => t.projectId === p.id && t.status !== "completed").length;
      return `<button class="project-nav-item ${selectedProject===p.id?"selected":""}" data-project-nav="${escapeHTML(p.id)}"><span class="project-color project-${escapeHTML(p.color)}"></span><span>${escapeHTML(p.name)}</span><small>${count}</small></button>`;
    }).join("");
  }
  function renderStats() {
    const total = state.tasks.length, completed = state.tasks.filter(t => t.status === "completed").length;
    $("#totalStat").textContent = total;
    $("#todayStat").textContent = state.tasks.filter(isToday).length;
    $("#completedStat").textContent = completed;
    $("#overdueStat").textContent = state.tasks.filter(isLate).length;
  }
  function getVisibleTasks() {
    const query = $("#searchInput").value.trim().toLocaleLowerCase("ar");
    let tasks = [...state.tasks];
    if (selectedProject) tasks = tasks.filter(t => t.projectId === selectedProject);
    if (navFilter === "today") tasks = tasks.filter(isToday);
    else if (navFilter === "upcoming") tasks = tasks.filter(t => t.status !== "completed" && t.due > todayISO());
    else if (navFilter === "completed") tasks = tasks.filter(t => t.status === "completed");
    if (currentFilter === "active") tasks = tasks.filter(t => t.status !== "completed");
    if (currentFilter === "completed") tasks = tasks.filter(t => t.status === "completed");
    if (query) tasks = tasks.filter(t => `${t.title} ${t.description} ${projectFor(t.projectId)?.name || ""}`.toLocaleLowerCase("ar").includes(query));
    const sort = $("#sortSelect").value;
    tasks.sort((a,b) => {
      if (sort === "priority") return ({high:0,medium:1,low:2}[a.priority] - {high:0,medium:1,low:2}[b.priority]) || a.due.localeCompare(b.due);
      if (sort === "created") return b.created - a.created;
      if (a.status !== b.status) return a.status === "completed" ? 1 : -1;
      return (a.due || "9999").localeCompare(b.due || "9999");
    });
    return tasks;
  }
  function renderTasks() {
    const tasks = getVisibleTasks();
    const labels = {overview:"مهامك",tasks:"كل المهام",today:"مهام اليوم",upcoming:"المهام القادمة",completed:"المهام المكتملة"};
    const title = selectedProject ? (projectFor(selectedProject)?.name || "المشروع") : (navFilter ? labels[navFilter] : labels[currentView] || "مهامك");
    $("#taskSectionTitle").textContent = title;
    $("#breadcrumbTitle").textContent = selectedProject ? title : (currentView === "overview" ? "نظرة عامة" : title);
    $("#pageTitle").innerHTML = selectedProject ? `مشروع ${escapeHTML(title)}` : currentView === "overview" ? 'صباح الإنجاز، أحمد <span class="wave">✦</span>' : escapeHTML(title);
    $("#pageSubtitle").textContent = selectedProject ? "تابع مهام هذا المشروع وتقدمه." : currentView === "overview" ? "إليك ملخص ما يحدث في مساحة عملك اليوم." : "كل شيء مرتب لتعرف خطوتك التالية.";
    $("#viewAllBtn").style.display = currentView === "overview" && !navFilter && !selectedProject ? "" : "none";
    $("#taskList").innerHTML = tasks.map(task => {
      const project = projectFor(task.projectId);
      const dateClass = isLate(task) ? "late" : isToday(task) ? "today" : "";
      return `<article class="task-row ${task.status==="completed"?"is-complete":""}">
        <button class="task-check ${task.status==="completed"?"checked":""}" data-toggle-task="${escapeHTML(task.id)}" aria-label="${task.status==="completed"?"إلغاء إكمال":"إكمال"} المهمة">${task.status==="completed"?"✓":""}</button>
        <div class="task-main"><div class="task-title-line"><span class="task-title">${escapeHTML(task.title)}</span><span class="priority ${escapeHTML(task.priority)}">${priorityLabel(task.priority)}</span></div>
        ${task.description?`<div class="task-description">${escapeHTML(task.description)}</div>`:""}
        <div class="task-meta"><span class="task-date ${dateClass}">◷ ${dateLabel(task.due)}${isLate(task)?" · متأخرة":""}</span>${project?`<span class="task-project"><i class="project-color project-${escapeHTML(project.color)}" style="display:inline-block;margin-left:4px"></i>${escapeHTML(project.name)}</span>`:""}</div></div>
        <div class="task-actions"><button data-edit-task="${escapeHTML(task.id)}" title="تعديل المهمة" aria-label="تعديل المهمة">✎</button><button data-delete-task="${escapeHTML(task.id)}" title="حذف المهمة" aria-label="حذف المهمة">×</button></div>
      </article>`;
    }).join("");
    $("#emptyState").classList.toggle("hidden", tasks.length > 0);
    $("#taskList").style.display = tasks.length ? "grid" : "none";
  }
  function renderProjects() {
    $("#projectList").innerHTML = state.projects.map(p => {
      const tasks = state.tasks.filter(t => t.projectId === p.id);
      const done = tasks.filter(t => t.status === "completed").length;
      const pct = tasks.length ? Math.round(done / tasks.length * 100) : 0;
      return `<div class="project-item"><div class="project-item-top"><div class="project-item-name"><span class="project-color project-${escapeHTML(p.color)}"></span><span>${escapeHTML(p.name)}</span></div><span class="project-item-count">${done}/${tasks.length} مهام</span></div><div class="project-track"><span class="project-${escapeHTML(p.color)}" style="width:${pct}%"></span></div></div>`;
    }).join("");
    if (!state.projects.length) $("#projectList").innerHTML = '<p class="task-description">لا توجد مشاريع حتى الآن.</p>';
    $("#taskProject").innerHTML = '<option value="">بدون مشروع</option>' + state.projects.map(p => `<option value="${escapeHTML(p.id)}">${escapeHTML(p.name)}</option>`).join("");
  }
  function updateProgress() {
    const total = state.tasks.length, done = state.tasks.filter(t => t.status === "completed").length;
    const pct = total ? Math.round(done / total * 100) : 0;
    $("#completionRate").textContent = pct + "%"; $("#ringValue").textContent = pct + "%";
    $("#progressRing").style.background = `conic-gradient(var(--primary) ${pct*3.6}deg, #eeecf8 ${pct*3.6}deg)`;
    $("#progressBar").style.width = pct + "%"; $("#progressDone").textContent = done; $("#progressRemaining").textContent = total-done;
  }
  function switchView(view, filter = null) {
    currentView = view; navFilter = filter; selectedProject = null; currentFilter = filter === "completed" ? "completed" : "all";
    $$(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.view === view || (filter && b.dataset.filter === filter)));
    $$(".filter-tab").forEach(b => b.classList.toggle("active", b.dataset.taskFilter === currentFilter));
    renderTasks(); renderNavigation();
    if (window.innerWidth <= 850) $("#sidebar").classList.remove("open");
  }
  function openTaskDialog(task = null) {
    $("#taskForm").reset();
    $("#taskId").value = task?.id || "";
    $("#taskModalTitle").textContent = task ? "تعديل المهمة" : "إضافة مهمة جديدة";
    $("#taskTitle").value = task?.title || "";
    $("#taskDescription").value = task?.description || "";
    $("#taskDue").value = task?.due || todayISO();
    $("#taskPriority").value = task?.priority || "medium";
    $("#taskProject").value = task?.projectId || selectedProject || "";
    $("#taskStatus").value = task?.status || "active";
    $("#taskDialog").showModal(); setTimeout(() => $("#taskTitle").focus(), 50);
  }
  function openProjectDialog() { $("#projectForm").reset(); $("#projectDialog").showModal(); setTimeout(() => $("#projectName").focus(), 50); }
  function closeDialog(id) { const d = document.getElementById(id); if (d?.open) d.close(); }

  $("#taskForm").addEventListener("submit", event => {
    event.preventDefault();
    const id = $("#taskId").value;
    const item = {id:id || uid(),title:$("#taskTitle").value.trim(),description:$("#taskDescription").value.trim(),due:$("#taskDue").value,priority:$("#taskPriority").value,projectId:$("#taskProject").value,status:$("#taskStatus").value,created:id ? (state.tasks.find(t=>t.id===id)?.created || Date.now()) : Date.now()};
    if (!item.title) return;
    if (id) { state.tasks = state.tasks.map(t => t.id === id ? item : t); showToast("تم تحديث المهمة بنجاح."); }
    else { state.tasks.unshift(item); showToast("أُضيفت المهمة الجديدة."); }
    saveState(); closeDialog("taskDialog"); render();
  });
  $("#projectForm").addEventListener("submit", event => {
    event.preventDefault();
    const name = $("#projectName").value.trim(); if (!name) return;
    if (state.projects.some(p => p.name.toLocaleLowerCase("ar") === name.toLocaleLowerCase("ar"))) { showToast("يوجد مشروع بهذا الاسم بالفعل."); return; }
    const project = {id:uid(),name,color:$("#projectColor").value}; state.projects.push(project); saveState(); closeDialog("projectDialog"); render(); showToast("تم إنشاء المشروع.");
  });
  document.addEventListener("click", event => {
    const target = event.target.closest("button"); if (!target) return;
    if (target.dataset.close) { closeDialog(target.dataset.close); return; }
    if (target.dataset.view) { switchView(target.dataset.view); return; }
    if (target.dataset.filter) { switchView(target.dataset.filter === "completed" ? "tasks" : "tasks", target.dataset.filter); return; }
    if (target.dataset.taskFilter) { currentFilter = target.dataset.taskFilter; $$(".filter-tab").forEach(b=>b.classList.toggle("active",b===target)); renderTasks(); return; }
    if (target.dataset.toggleTask) {
      const task = state.tasks.find(t=>t.id===target.dataset.toggleTask); if (!task) return;
      task.status = task.status === "completed" ? "active" : "completed"; saveState(); render(); showToast(task.status==="completed"?"أحسنت! تم إكمال المهمة.":"أُعيد فتح المهمة."); return;
    }
    if (target.dataset.editTask) { const task=state.tasks.find(t=>t.id===target.dataset.editTask); if(task)openTaskDialog(task); return; }
    if (target.dataset.deleteTask) {
      const task=state.tasks.find(t=>t.id===target.dataset.deleteTask); if(!task)return;
      if(confirm(`هل تريد حذف المهمة «${task.title}»؟`)){state.tasks=state.tasks.filter(t=>t.id!==task.id);saveState();render();showToast("تم حذف المهمة.");} return;
    }
    if (target.dataset.projectNav) { selectedProject=target.dataset.projectNav; currentView="tasks"; navFilter=null; currentFilter="all"; $$(".nav-item").forEach(b=>b.classList.remove("active")); $$(".filter-tab").forEach(b=>b.classList.toggle("active",b.dataset.taskFilter==="all")); renderTasks();renderNavigation(); if(window.innerWidth<=850)$("#sidebar").classList.remove("open"); return; }
    if (target.id === "addTaskBtn" || target.id === "emptyAddBtn") { openTaskDialog(); return; }
    if (["addProjectBtn","addProjectMini","addProjectLink"].includes(target.id)) { openProjectDialog(); return; }
    if (target.id === "viewAllBtn") { switchView("tasks"); return; }
    if (target.id === "mobileMenu") { $("#sidebar").classList.toggle("open"); return; }
    if (target.id === "themeToggle") { document.body.classList.toggle("dark"); localStorage.setItem("injaz-theme",document.body.classList.contains("dark")?"dark":"light"); return; }
  });
  $("#searchInput").addEventListener("input", renderTasks);
  $("#sortSelect").addEventListener("change", renderTasks);
  document.addEventListener("keydown", event => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); $("#searchInput").focus(); }
    if (event.key === "Escape") $("#sidebar").classList.remove("open");
  });
  document.querySelectorAll("dialog").forEach(dialog => dialog.addEventListener("click", event => {
    if (event.target === dialog) dialog.close();
  }));
  try { if (localStorage.getItem("injaz-theme") === "dark") document.body.classList.add("dark"); } catch {}
  render();
})();