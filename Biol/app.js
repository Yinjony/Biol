const STORAGE_KEY = "bio-question-bank-v1";

const seedQuestions = [
  {
    id: "seed-1",
    type: "CHOICE",
    content: "下列哪一项是植物细胞特有的结构？",
    options: [
      { label: "A", text: "细胞膜" },
      { label: "B", text: "细胞核" },
      { label: "C", text: "叶绿体" },
      { label: "D", text: "线粒体" }
    ],
    answer: "C",
    createdAt: "2026-06-04T00:00:00.000Z",
    updatedAt: "2026-06-04T00:00:00.000Z"
  },
  {
    id: "seed-2",
    type: "JUDGE",
    content: "酶在高温环境下通常会发生变性，活性降低或丧失。",
    options: null,
    answer: "对",
    createdAt: "2026-06-04T00:00:00.000Z",
    updatedAt: "2026-06-04T00:00:00.000Z"
  },
  {
    id: "seed-3",
    type: "CHOICE",
    content: "人体血液中运输氧气的主要成分是？",
    options: [
      { label: "A", text: "血浆" },
      { label: "B", text: "红细胞中的血红蛋白" },
      { label: "C", text: "白细胞" },
      { label: "D", text: "血小板" }
    ],
    answer: "B",
    createdAt: "2026-06-04T00:00:00.000Z",
    updatedAt: "2026-06-04T00:00:00.000Z"
  },
  {
    id: "seed-4",
    type: "JUDGE",
    content: "DNA 的基本组成单位是氨基酸。",
    options: null,
    answer: "错",
    createdAt: "2026-06-04T00:00:00.000Z",
    updatedAt: "2026-06-04T00:00:00.000Z"
  },
  {
    id: "seed-5",
    type: "CHOICE",
    content: "生态系统中，能量流动的特点通常是？",
    options: [
      { label: "A", text: "单向流动，逐级递减" },
      { label: "B", text: "循环流动，逐级增加" },
      { label: "C", text: "双向流动，保持不变" },
      { label: "D", text: "随机流动，没有规律" }
    ],
    answer: "A",
    createdAt: "2026-06-04T00:00:00.000Z",
    updatedAt: "2026-06-04T00:00:00.000Z"
  }
];

const state = {
  questions: loadQuestions(),
  activeView: "bank",
  quiz: {
    items: [],
    responses: {}
  }
};

const els = {
  navTabs: document.querySelectorAll(".nav-tab"),
  views: document.querySelectorAll(".view"),
  statTotal: document.getElementById("statTotal"),
  statChoice: document.getElementById("statChoice"),
  statJudge: document.getElementById("statJudge"),
  resultCount: document.getElementById("resultCount"),
  searchInput: document.getElementById("searchInput"),
  newQuestionBtn: document.getElementById("newQuestionBtn"),
  questionForm: document.getElementById("questionForm"),
  editingId: document.getElementById("editingId"),
  questionType: document.getElementById("questionType"),
  answerInput: document.getElementById("answerInput"),
  contentInput: document.getElementById("contentInput"),
  optionFields: document.getElementById("optionFields"),
  optionInputs: document.querySelectorAll(".option-input"),
  resetFormBtn: document.getElementById("resetFormBtn"),
  questionList: document.getElementById("questionList"),
  quizCount: document.getElementById("quizCount"),
  startQuizBtn: document.getElementById("startQuizBtn"),
  submitQuizBtn: document.getElementById("submitQuizBtn"),
  quizBoard: document.getElementById("quizBoard"),
  quizStatus: document.getElementById("quizStatus"),
  fileInput: document.getElementById("fileInput"),
  parseTextBtn: document.getElementById("parseTextBtn"),
  rawImportText: document.getElementById("rawImportText"),
  parsedType: document.getElementById("parsedType"),
  parsedContent: document.getElementById("parsedContent"),
  parsedOptions: document.getElementById("parsedOptions"),
  modalBackdrop: document.getElementById("modalBackdrop"),
  modalTitle: document.getElementById("modalTitle"),
  modalMessage: document.getElementById("modalMessage"),
  modalActions: document.getElementById("modalActions"),
  toast: document.getElementById("toast")
};

bindEvents();
renderAll();

function bindEvents() {
  els.navTabs.forEach((button) => {
    button.addEventListener("click", () => setActiveView(button.dataset.view));
  });

  els.searchInput.addEventListener("input", renderQuestionList);
  els.newQuestionBtn.addEventListener("click", () => {
    resetForm();
    els.contentInput.focus();
  });

  els.questionType.addEventListener("change", updateTypeControls);
  els.resetFormBtn.addEventListener("click", resetForm);
  els.questionForm.addEventListener("submit", saveQuestionFromForm);

  els.questionList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const id = button.closest(".question-card")?.dataset.id;
    if (!id) return;

    if (button.dataset.action === "edit") {
      editQuestion(id);
    }

    if (button.dataset.action === "delete") {
      confirmDeleteQuestion(id);
    }
  });

  els.startQuizBtn.addEventListener("click", startQuiz);
  els.submitQuizBtn.addEventListener("click", submitQuiz);
  els.quizBoard.addEventListener("click", (event) => {
    const option = event.target.closest(".answer-option");
    if (!option) return;
    answerQuestion(option.dataset.id, option.dataset.answer);
  });

  els.parseTextBtn.addEventListener("click", parseImportText);
  els.fileInput.addEventListener("change", readImportFile);
}

function renderAll() {
  updateTypeControls();
  renderStats();
  renderQuestionList();
  renderQuiz();
}

function loadQuestions() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seedQuestions));
    return [...seedQuestions];
  }

  try {
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function persistQuestions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.questions));
}

function renderStats() {
  const total = state.questions.length;
  const choice = state.questions.filter((question) => question.type === "CHOICE").length;
  const judge = state.questions.filter((question) => question.type === "JUDGE").length;

  els.statTotal.textContent = total;
  els.statChoice.textContent = choice;
  els.statJudge.textContent = judge;
}

function renderQuestionList() {
  const query = els.searchInput.value.trim();
  const matched = state.questions
    .filter((question) => fuzzyMatch(question.content, query))
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  els.resultCount.textContent = `${matched.length} 条`;

  if (matched.length === 0) {
    els.questionList.innerHTML = `<div class="empty-state">没有匹配的题目</div>`;
    return;
  }

  els.questionList.innerHTML = matched.map(renderQuestionCard).join("");
}

function renderQuestionCard(question) {
  const options = question.type === "CHOICE"
    ? `<div class="card-options">${question.options.map((option) => `<div>${escapeHtml(option.label)}. ${escapeHtml(option.text)}</div>`).join("")}</div>`
    : "";

  return `
    <article class="question-card" data-id="${escapeHtml(question.id)}">
      <header>
        <h3>${escapeHtml(question.content)}</h3>
        <span class="tag">${question.type === "CHOICE" ? "选择题" : "判断题"}</span>
      </header>
      <div class="tag-row">
        <span class="tag answer-tag">答案：${escapeHtml(question.answer)}</span>
        <span class="tag">更新：${formatDate(question.updatedAt)}</span>
      </div>
      ${options}
      <div class="card-actions">
        <button class="tiny-button" type="button" data-action="edit">修改</button>
        <button class="tiny-button danger-text" type="button" data-action="delete">删除</button>
      </div>
    </article>
  `;
}

function saveQuestionFromForm(event) {
  event.preventDefault();

  const type = els.questionType.value;
  const content = compactText(els.contentInput.value);
  const rawAnswer = els.answerInput.value.trim();
  const answer = normalizeAnswer(rawAnswer, type);

  if (!content) {
    showToast("请填写题干");
    els.contentInput.focus();
    return;
  }

  if (!answer) {
    showToast(type === "CHOICE" ? "请填写 A-D 作为答案" : "请填写 对 或 错");
    els.answerInput.focus();
    return;
  }

  const options = type === "CHOICE" ? collectOptions() : null;

  if (type === "CHOICE") {
    if (options.length < 2) {
      showToast("选择题至少需要两个选项");
      return;
    }

    if (!options.some((option) => option.label === answer)) {
      showToast("答案必须对应已填写的选项");
      return;
    }
  }

  const now = new Date().toISOString();
  const editingId = els.editingId.value;

  if (editingId) {
    state.questions = state.questions.map((question) => {
      if (question.id !== editingId) return question;
      return {
        ...question,
        type,
        content,
        options,
        answer,
        updatedAt: now
      };
    });
    showToast("题目已更新");
  } else {
    state.questions.unshift({
      id: createId(),
      type,
      content,
      options,
      answer,
      createdAt: now,
      updatedAt: now
    });
    showToast("题目已保存");
  }

  persistQuestions();
  resetForm();
  renderAll();
}

function collectOptions() {
  return Array.from(els.optionInputs)
    .map((input) => ({
      label: input.dataset.option,
      text: compactText(input.value)
    }))
    .filter((option) => option.text);
}

function editQuestion(id) {
  const question = state.questions.find((item) => item.id === id);
  if (!question) return;

  setActiveView("bank");
  els.editingId.value = question.id;
  els.questionType.value = question.type;
  els.contentInput.value = question.content;
  els.answerInput.value = question.answer;
  els.optionInputs.forEach((input) => {
    const option = question.options?.find((item) => item.label === input.dataset.option);
    input.value = option?.text ?? "";
  });

  updateTypeControls();
  els.contentInput.focus();
}

function confirmDeleteQuestion(id) {
  const question = state.questions.find((item) => item.id === id);
  if (!question) return;

  showModal({
    title: "确认删除",
    message: `确定要删除这道题吗？\n${question.content}`,
    actions: [
      { label: "取消", variant: "secondary", handler: closeModal },
      {
        label: "删除",
        variant: "danger",
        handler: () => {
          state.questions = state.questions.filter((item) => item.id !== id);
          state.quiz.items = state.quiz.items.filter((item) => item.id !== id);
          delete state.quiz.responses[id];
          persistQuestions();
          closeModal();
          renderAll();
          showToast("题目已删除");
        }
      }
    ]
  });
}

function resetForm() {
  els.editingId.value = "";
  els.questionType.value = "CHOICE";
  els.answerInput.value = "";
  els.contentInput.value = "";
  els.optionInputs.forEach((input) => {
    input.value = "";
  });
  updateTypeControls();
}

function updateTypeControls() {
  const isChoice = els.questionType.value === "CHOICE";
  els.optionFields.hidden = !isChoice;
  els.answerInput.placeholder = isChoice ? "A / B / C / D" : "对 / 错";
}

function startQuiz() {
  if (state.questions.length === 0) {
    showModal({
      title: "无法开始",
      message: "题库里还没有题目。",
      actions: [{ label: "知道了", variant: "primary", handler: closeModal }]
    });
    return;
  }

  const requested = Number(els.quizCount.value);
  const shuffled = shuffle([...state.questions]);
  const count = Math.min(requested, shuffled.length);

  state.quiz.items = shuffled.slice(0, count);
  state.quiz.responses = {};
  renderQuiz();

  if (count < requested) {
    showToast(`题库不足 ${requested} 道，已抽取 ${count} 道`);
  } else {
    showToast(`已抽取 ${count} 道题`);
  }
}

function renderQuiz() {
  const total = state.quiz.items.length;
  const answered = Object.keys(state.quiz.responses).length;
  els.quizStatus.textContent = total > 0 ? `${answered}/${total} 已作答` : "未开始";

  if (total === 0) {
    els.quizBoard.innerHTML = "";
    return;
  }

  els.quizBoard.innerHTML = state.quiz.items.map((question, index) => renderQuizCard(question, index)).join("");
}

function renderQuizCard(question, index) {
  const response = state.quiz.responses[question.id];
  const answered = Boolean(response);
  const answerOptions = getAnswerOptions(question);

  return `
    <article class="quiz-card" data-id="${escapeHtml(question.id)}">
      <header>
        <div class="quiz-card-title">
          <span class="quiz-index">${index + 1}</span>
          <h3>${escapeHtml(question.content)}</h3>
        </div>
        <span class="tag">${question.type === "CHOICE" ? "选择题" : "判断题"}</span>
      </header>
      <div class="answer-buttons">
        ${answerOptions.map((option) => renderAnswerButton(question, option, response)).join("")}
      </div>
      <div class="feedback ${answered ? (response.correct ? "correct" : "wrong") : ""}">
        ${answered ? renderFeedback(question, response) : ""}
      </div>
    </article>
  `;
}

function renderAnswerButton(question, option, response) {
  const normalizedCorrect = normalizeAnswer(question.answer, question.type);
  const isAnswered = Boolean(response);
  const isSelected = response?.selected === option.label;
  const isCorrectOption = option.label === normalizedCorrect;
  const className = [
    "answer-option",
    isAnswered && isCorrectOption ? "correct" : "",
    isAnswered && isSelected && !response.correct ? "wrong" : ""
  ].filter(Boolean).join(" ");
  const text = question.type === "CHOICE"
    ? `${option.label}. ${option.text}`
    : option.text;

  return `
    <button
      class="${className}"
      type="button"
      data-id="${escapeHtml(question.id)}"
      data-answer="${escapeHtml(option.label)}"
      ${isAnswered ? "disabled" : ""}
    >${escapeHtml(text)}</button>
  `;
}

function renderFeedback(question, response) {
  if (response.correct) {
    return "回答正确";
  }

  return `回答错误，正确答案：${escapeHtml(normalizeAnswer(question.answer, question.type))}`;
}

function answerQuestion(id, selected) {
  const question = state.quiz.items.find((item) => item.id === id);
  if (!question || state.quiz.responses[id]) return;

  const normalizedSelected = normalizeAnswer(selected, question.type);
  const normalizedCorrect = normalizeAnswer(question.answer, question.type);
  state.quiz.responses[id] = {
    selected: normalizedSelected,
    correct: normalizedSelected === normalizedCorrect
  };

  renderQuiz();
}

function submitQuiz() {
  if (state.quiz.items.length === 0) {
    showModal({
      title: "尚未开始",
      message: "请先随机抽题。",
      actions: [{ label: "知道了", variant: "primary", handler: closeModal }]
    });
    return;
  }

  const missing = state.quiz.items
    .map((question, index) => (state.quiz.responses[question.id] ? null : index + 1))
    .filter((index) => index !== null);

  if (missing.length > 0) {
    showModal({
      title: "还有题没做",
      message: `未作答题号：${missing.join("、")}`,
      actions: [{ label: "继续做题", variant: "primary", handler: closeModal }]
    });
    return;
  }

  const correct = Object.values(state.quiz.responses).filter((response) => response.correct).length;
  const wrong = state.quiz.items.length - correct;
  showModal({
    title: "练习完成",
    message: `做对题数：${correct}\n做错题数：${wrong}`,
    actions: [
      { label: "再来一组", variant: "primary", handler: () => {
        closeModal();
        startQuiz();
      } },
      { label: "关闭", variant: "secondary", handler: closeModal }
    ]
  });
}

function parseImportText() {
  const parsed = parseQuestionText(els.rawImportText.value);

  if (!parsed.content) {
    showToast("没有识别到题干");
    return;
  }

  els.parsedType.textContent = parsed.type === "CHOICE" ? "选择题" : "判断题";
  els.parsedContent.textContent = parsed.content;
  els.parsedOptions.textContent = parsed.options?.length
    ? parsed.options.map((option) => `${option.label}. ${option.text}`).join(" / ")
    : "无";

  setActiveView("bank");
  resetForm();
  els.questionType.value = parsed.type;
  els.contentInput.value = parsed.content;
  els.answerInput.value = parsed.answer ?? "";
  els.optionInputs.forEach((input) => {
    const option = parsed.options?.find((item) => item.label === input.dataset.option);
    input.value = option?.text ?? "";
  });
  updateTypeControls();
  showToast("已填入编辑表单，请核对答案");
}

function parseQuestionText(rawText) {
  const text = rawText.replace(/\r/g, "\n").trim();
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const answerMatch = text.match(/(?:答案|参考答案|正确答案)\s*[:：]?\s*([A-Da-d]|正确|错误|对|错|√|×|true|false)/i);
  const options = [];
  const contentLines = [];

  lines.forEach((line) => {
    if (/^(答案|参考答案|正确答案)\s*[:：]?/i.test(line)) {
      return;
    }

    const optionMatch = line.match(/^([A-Da-d])\s*[.．、:：)]\s*(.+)$/);
    if (optionMatch) {
      options.push({
        label: optionMatch[1].toUpperCase(),
        text: compactText(optionMatch[2])
      });
      return;
    }

    contentLines.push(line.replace(/^(题目|题干|判断题|选择题)\s*[:：]?\s*/i, ""));
  });

  const type = options.length >= 2 ? "CHOICE" : "JUDGE";
  const content = compactText(contentLines.join("\n"));
  const rawAnswer = answerMatch?.[1] ?? "";

  return {
    type,
    content,
    options: type === "CHOICE" ? options : null,
    answer: rawAnswer ? normalizeAnswer(rawAnswer, type) : ""
  };
}

function readImportFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    els.rawImportText.value = String(reader.result ?? "");
    parseImportText();
  };
  reader.onerror = () => showToast("文件读取失败");
  reader.readAsText(file, "UTF-8");
  event.target.value = "";
}

function setActiveView(view) {
  state.activeView = view;
  els.navTabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.view === view);
  });
  els.views.forEach((panel) => {
    panel.classList.toggle("active", panel.id === `view-${view}`);
  });
}

function showModal({ title, message, actions }) {
  els.modalTitle.textContent = title;
  els.modalMessage.textContent = message;
  els.modalActions.innerHTML = "";

  actions.forEach((action) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = action.label;
    button.className = action.variant === "danger"
      ? "danger-button"
      : action.variant === "primary"
        ? "primary-button"
        : "secondary-button";
    button.addEventListener("click", action.handler);
    els.modalActions.appendChild(button);
  });

  els.modalBackdrop.hidden = false;
}

function closeModal() {
  els.modalBackdrop.hidden = true;
}

function showToast(message) {
  window.clearTimeout(showToast.timer);
  els.toast.textContent = message;
  els.toast.classList.add("show");
  showToast.timer = window.setTimeout(() => {
    els.toast.classList.remove("show");
  }, 1800);
}

function getAnswerOptions(question) {
  if (question.type === "CHOICE") {
    return question.options;
  }

  return [
    { label: "对", text: "对" },
    { label: "错", text: "错" }
  ];
}

function normalizeAnswer(answer, type) {
  const value = String(answer ?? "").trim();
  if (!value) return "";

  if (type === "CHOICE") {
    const choice = value.toUpperCase().match(/[A-D]/)?.[0] ?? "";
    return choice;
  }

  const lower = value.toLowerCase();
  if (["对", "正确", "true", "t", "yes", "y", "√"].includes(lower)) return "对";
  if (["错", "错误", "false", "f", "no", "n", "×", "x"].includes(lower)) return "错";
  return "";
}

function fuzzyMatch(content, query) {
  const normalizedContent = normalizeForSearch(content);
  const normalizedQuery = normalizeForSearch(query);
  if (!normalizedQuery) return true;
  if (normalizedContent.includes(normalizedQuery)) return true;

  let index = 0;
  for (const char of normalizedContent) {
    if (char === normalizedQuery[index]) index += 1;
    if (index === normalizedQuery.length) return true;
  }

  return false;
}

function normalizeForSearch(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\s+/g, "");
}

function compactText(value) {
  return String(value ?? "")
    .replace(/\s*\n\s*/g, "\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function shuffle(items) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [items[index], items[randomIndex]] = [items[randomIndex], items[index]];
  }
  return items;
}

function createId() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `q-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
