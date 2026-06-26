(function () {
  const STORAGE_KEY = "bod.fitness.mvp.v2";
  const LEGACY_STORAGE_KEY = "bod.fitness.mvp.v1";
  const dateKey = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  const todayKey = () => dateKey(new Date());
  const makeId = () => {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };

  const workoutTypes = {
    strength: { label: "力量训练", met: 5.0 },
    cardio: { label: "有氧训练", met: 7.0 },
    hiit: { label: "HIIT", met: 9.0 },
    yoga: { label: "瑜伽/拉伸", met: 2.8 },
    walk: { label: "快走", met: 4.3 },
    run: { label: "跑步", met: 8.3 },
    cycling: { label: "骑行", met: 7.5 },
  };

  const intensityMultiplier = {
    light: { label: "轻松", value: 0.82 },
    moderate: { label: "中等", value: 1 },
    hard: { label: "较高", value: 1.18 },
  };

  const goalMeta = {
    fat_loss: {
      label: "减脂",
      target: 420,
      hint: "建议今天通过训练消耗 420 kcal，重点是稳定运动频率。",
    },
    muscle_gain: {
      label: "增肌",
      target: 280,
      hint: "建议今天完成 280 kcal 左右训练消耗，优先保证力量训练质量。",
    },
    maintain: {
      label: "保持",
      target: 320,
      hint: "建议今天完成 320 kcal 活动消耗，保持节奏和恢复平衡。",
    },
  };

  const defaultState = {
    profile: {
      height: 175,
      currentWeight: 70,
      goal: "fat_loss",
      onboarded: false,
    },
    workouts: [],
    weights: [],
    water: {},
    achievements: {},
  };

  let state = loadState();
  let chartRange = 7;
  let toastTimer;

  const els = {
    goalButtonLabel: document.getElementById("goalButtonLabel"),
    goalHint: document.getElementById("goalHint"),
    goalRing: document.getElementById("goalRing"),
    goalPercent: document.getElementById("goalPercent"),
    goalRemain: document.getElementById("goalRemain"),
    targetCalories: document.getElementById("targetCalories"),
    todayCalories: document.getElementById("todayCalories"),
    todayWater: document.getElementById("todayWater"),
    latestWeight: document.getElementById("latestWeight"),
    recommendationText: document.getElementById("recommendationText"),
    achievementGrid: document.getElementById("achievementGrid"),
    achievementCount: document.getElementById("achievementCount"),
    achievementToast: document.getElementById("achievementToast"),
    shareButton: document.getElementById("shareButton"),
    workoutForm: document.getElementById("workoutForm"),
    workoutType: document.getElementById("workoutType"),
    workoutMinutes: document.getElementById("workoutMinutes"),
    workoutIntensity: document.getElementById("workoutIntensity"),
    workoutNote: document.getElementById("workoutNote"),
    workoutCount: document.getElementById("workoutCount"),
    workoutList: document.getElementById("workoutList"),
    weightForm: document.getElementById("weightForm"),
    weightInput: document.getElementById("weightInput"),
    weightList: document.getElementById("weightList"),
    weightTrendLabel: document.getElementById("weightTrendLabel"),
    waterForm: document.getElementById("waterForm"),
    waterInput: document.getElementById("waterInput"),
    settingsButton: document.getElementById("settingsButton"),
    settingsDialog: document.getElementById("settingsDialog"),
    profileForm: document.getElementById("profileForm"),
    settingsEyebrow: document.getElementById("settingsEyebrow"),
    settingsTitle: document.getElementById("settingsTitle"),
    settingsIntro: document.getElementById("settingsIntro"),
    heightInput: document.getElementById("heightInput"),
    profileWeightInput: document.getElementById("profileWeightInput"),
    goalInput: document.getElementById("goalInput"),
    weightChart: document.getElementById("weightChart"),
    weekCalories: document.getElementById("weekCalories"),
    calorieBars: document.getElementById("calorieBars"),
  };

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
      const saved = JSON.parse(raw);
      if (!saved || typeof saved !== "object") return structuredClone(defaultState);
      return {
        ...structuredClone(defaultState),
        ...saved,
        profile: { ...defaultState.profile, ...(saved.profile || {}) },
        workouts: Array.isArray(saved.workouts) ? saved.workouts : [],
        weights: Array.isArray(saved.weights) ? saved.weights : [],
        water: saved.water && typeof saved.water === "object" ? saved.water : {},
        achievements: saved.achievements && typeof saved.achievements === "object" ? saved.achievements : {},
      };
    } catch {
      return structuredClone(defaultState);
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function estimateCalories(type, minutes, intensity, weightKg) {
    const met = workoutTypes[type].met * intensityMultiplier[intensity].value;
    return Math.round((met * 3.5 * weightKg * minutes) / 200);
  }

  function todayWorkouts() {
    const key = todayKey();
    return state.workouts.filter((item) => item.date === key);
  }

  function latestWeightRecord() {
    return [...state.weights].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  }

  function currentWeight() {
    return latestWeightRecord()?.value || Number(state.profile.currentWeight) || 70;
  }

  function goalInfo() {
    return goalMeta[state.profile.goal] || goalMeta.fat_loss;
  }

  function todayCaloriesTotal() {
    return todayWorkouts().reduce((sum, item) => sum + Number(item.calories || 0), 0);
  }

  function totalCaloriesFor(date) {
    return state.workouts
      .filter((item) => item.date === date)
      .reduce((sum, item) => sum + Number(item.calories || 0), 0);
  }

  function addWater(amount) {
    const key = todayKey();
    state.water[key] = Math.max(0, Number(state.water[key] || 0) + amount);
    saveState();
    render();
  }

  function dateOffset(daysBack) {
    const date = new Date();
    date.setDate(date.getDate() - daysBack);
    return dateKey(date);
  }

  function getWeightTrend(days) {
    const cutoff = dateOffset(days - 1);
    return state.weights
      .filter((item) => item.date >= cutoff)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  function achievementDefinitions() {
    const calories = todayCaloriesTotal();
    const target = goalInfo().target;
    const water = Number(state.water[todayKey()] || 0);
    const hasWeightToday = state.weights.some((item) => item.date === todayKey());

    return [
      {
        id: "first_workout",
        title: "启动训练",
        text: "完成 1 条训练记录",
        done: todayWorkouts().length > 0,
      },
      {
        id: "target_calories",
        title: "目标达成",
        text: `达到 ${target} kcal 消耗`,
        done: calories >= target,
      },
      {
        id: "water_ready",
        title: "补水在线",
        text: "喝水达到 1500ml",
        done: water >= 1500,
      },
      {
        id: "body_check",
        title: "身体反馈",
        text: "记录今日体重",
        done: hasWeightToday,
      },
    ];
  }

  function updateAchievements(shouldToast = true) {
    const key = todayKey();
    const previous = state.achievements[key] || {};
    const next = {};
    const newlyDone = [];

    achievementDefinitions().forEach((item) => {
      next[item.id] = item.done;
      if (item.done && !previous[item.id]) newlyDone.push(item.title);
    });

    state.achievements[key] = next;
    if (newlyDone.length) {
      saveState();
      if (shouldToast) showToast(`成就解锁：${newlyDone[0]}`);
    }
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    els.achievementToast.textContent = message;
    els.achievementToast.classList.add("show");
    toastTimer = setTimeout(() => els.achievementToast.classList.remove("show"), 2600);
  }

  function getRecommendation() {
    const workouts = todayWorkouts();
    const calories = todayCaloriesTotal();
    const target = goalInfo().target;
    const remain = Math.max(0, target - calories);
    const water = Number(state.water[todayKey()] || 0);
    const lastSevenWorkoutDays = new Set(
      state.workouts.filter((item) => item.date >= dateOffset(6)).map((item) => item.date),
    ).size;
    const trend = getWeightTrend(7);
    const firstWeight = trend[0]?.value;
    const lastWeight = trend[trend.length - 1]?.value;
    const goal = state.profile.goal;

    if (!workouts.length) {
      return `今天还没有训练记录。按你的${goalInfo().label}目标，建议先完成 ${target} kcal 左右的活动消耗。`;
    }

    if (calories >= target && water < 1500) {
      return "训练目标已经达成，下一步把喝水补到 1500ml 以上，再做 8-10 分钟拉伸。";
    }

    if (calories < target) {
      return `今天还差 ${remain} kcal 达成目标。可以补 15-25 分钟快走、骑行或轻有氧。`;
    }

    if (lastSevenWorkoutDays >= 5) {
      return "最近训练频率很高，下一步更适合轻有氧、拉伸或休息，让表现恢复上来。";
    }

    if (goal === "fat_loss" && firstWeight && lastWeight && lastWeight > firstWeight + 0.4) {
      return "最近体重略上行。下一次训练可以加 15-20 分钟中低强度有氧，并保持蛋白质摄入。";
    }

    if (goal === "muscle_gain" && calories > target) {
      return "今天训练消耗已经够了。下一步优先补充蛋白质和碳水，明天关注同肌群酸痛程度。";
    }

    return "今日训练目标完成。记录一下体重或喝水，给自己一个完整闭环。";
  }

  function renderGoal() {
    const calories = todayCaloriesTotal();
    const target = goalInfo().target;
    const remain = Math.max(0, target - calories);
    const percent = Math.min(100, Math.round((calories / target) * 100));
    const circumference = 2 * Math.PI * 50;
    const offset = circumference * (1 - percent / 100);

    els.goalButtonLabel.textContent = goalInfo().label;
    els.goalHint.textContent = goalInfo().hint;
    els.targetCalories.textContent = target;
    els.goalPercent.textContent = `${percent}%`;
    els.goalRemain.textContent = remain > 0 ? `还差 ${remain} kcal` : "今日达成";
    els.goalRing.style.strokeDasharray = `${circumference}`;
    els.goalRing.style.strokeDashoffset = `${offset}`;
  }

  function renderSummary() {
    const calories = todayCaloriesTotal();
    const weight = currentWeight();
    els.todayCalories.textContent = calories;
    els.todayWater.textContent = Number(state.water[todayKey()] || 0);
    els.latestWeight.textContent = weight ? Number(weight).toFixed(1) : "--";
    els.recommendationText.textContent = getRecommendation();
    renderGoal();
  }

  function renderAchievements() {
    const items = achievementDefinitions();
    const doneCount = items.filter((item) => item.done).length;
    els.achievementCount.textContent = `${doneCount}/${items.length}`;
    els.achievementGrid.innerHTML = items
      .map(
        (item) => `
          <article class="achievement ${item.done ? "done" : ""}">
            <span>${item.done ? "✓" : "·"}</span>
            <div>
              <strong>${item.title}</strong>
              <small>${item.text}</small>
            </div>
          </article>
        `,
      )
      .join("");
  }

  function renderWorkoutList() {
    const workouts = todayWorkouts().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    els.workoutCount.textContent = `${workouts.length} 条`;
    if (!workouts.length) {
      els.workoutList.innerHTML = '<div class="empty-state">还没有训练记录</div>';
      return;
    }

    els.workoutList.innerHTML = workouts
      .map((item) => {
        const type = workoutTypes[item.type]?.label || "训练";
        const intensity = intensityMultiplier[item.intensity]?.label || "中等";
        const note = item.note ? ` · ${escapeHtml(item.note)}` : "";
        return `
          <article class="list-item">
            <div>
              <strong>${type}</strong>
              <small>${item.minutes} 分钟 · ${intensity}${note}</small>
            </div>
            <b>${item.calories} kcal</b>
          </article>
        `;
      })
      .join("");
  }

  function renderWeightList() {
    const weights = [...state.weights].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8);
    if (!weights.length) {
      els.weightList.innerHTML = '<div class="empty-state">记录一次体重后，这里会显示最近变化</div>';
      els.weightTrendLabel.textContent = "暂无趋势";
      return;
    }

    const first = weights[weights.length - 1].value;
    const latest = weights[0].value;
    const diff = latest - first;
    els.weightTrendLabel.textContent = weights.length > 1 ? `${diff >= 0 ? "+" : ""}${diff.toFixed(1)} kg` : "已记录 1 次";
    els.weightList.innerHTML = weights
      .map(
        (item) => `
          <article class="list-item">
            <div>
              <strong>${Number(item.value).toFixed(1)} kg</strong>
              <small>${item.date}</small>
            </div>
            <b>体重</b>
          </article>
        `,
      )
      .join("");
  }

  function renderWeightChart() {
    const canvas = els.weightChart;
    const ctx = canvas.getContext("2d");
    const points = getWeightTrend(chartRange);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fbfcfa";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#dfe6dc";
    ctx.lineWidth = 1;

    for (let i = 0; i < 4; i += 1) {
      const y = 42 + i * 70;
      ctx.beginPath();
      ctx.moveTo(42, y);
      ctx.lineTo(canvas.width - 28, y);
      ctx.stroke();
    }

    ctx.fillStyle = "#68716d";
    ctx.font = "24px system-ui";
    if (!points.length) {
      ctx.fillText("暂无体重记录", 248, 166);
      return;
    }

    if (points.length === 1) {
      ctx.fillText(`${Number(points[0].value).toFixed(1)} kg`, 280, 148);
      ctx.fillText("继续记录后会生成趋势线", 208, 184);
      return;
    }

    const values = points.map((item) => Number(item.value));
    const min = Math.min(...values) - 0.3;
    const max = Math.max(...values) + 0.3;
    const xStep = (canvas.width - 90) / Math.max(points.length - 1, 1);

    ctx.beginPath();
    points.forEach((item, index) => {
      const x = 46 + index * xStep;
      const y = 272 - ((Number(item.value) - min) / (max - min || 1)) * 220;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = "#2f8f5b";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.stroke();

    points.forEach((item, index) => {
      const x = 46 + index * xStep;
      const y = 272 - ((Number(item.value) - min) / (max - min || 1)) * 220;
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.strokeStyle = "#2f8f5b";
      ctx.lineWidth = 4;
      ctx.stroke();
      if (index === points.length - 1) {
        ctx.fillStyle = "#19211d";
        ctx.font = "22px system-ui";
        ctx.fillText(`${Number(item.value).toFixed(1)} kg`, x - 42, y - 16);
      }
    });
  }

  function renderCalorieBars() {
    const days = Array.from({ length: 7 }, (_, index) => dateOffset(6 - index));
    const totals = days.map((date) => totalCaloriesFor(date));
    const max = Math.max(...totals, 1);
    const weekTotal = totals.reduce((sum, value) => sum + value, 0);
    els.weekCalories.textContent = `本周 ${weekTotal} kcal`;
    els.calorieBars.innerHTML = days
      .map((date, index) => {
        const height = Math.max(8, Math.round((totals[index] / max) * 112));
        const label = date.slice(5).replace("-", "/");
        return `<div class="bar"><span style="height:${height}px"></span>${label}</div>`;
      })
      .join("");
  }

  function render() {
    renderSummary();
    renderAchievements();
    renderWorkoutList();
    renderWeightList();
    renderWeightChart();
    renderCalorieBars();
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function openSettings(isOnboarding) {
    els.settingsEyebrow.textContent = isOnboarding ? "新用户引导" : "个人设置";
    els.settingsTitle.textContent = isOnboarding ? "先确立你的目标" : "调整你的目标";
    els.settingsIntro.textContent = isOnboarding
      ? "选择目标后，BOD 会给出每日训练消耗建议、当前差距和成就反馈。"
      : "目标会影响每日建议消耗和训练后的行动建议。";
    els.profileForm.querySelector(".primary-button").textContent = isOnboarding ? "开始记录" : "保存设置";
    els.heightInput.value = state.profile.height;
    els.profileWeightInput.value = currentWeight();
    els.goalInput.value = state.profile.goal;
    els.settingsDialog.dataset.onboarding = isOnboarding ? "true" : "false";
    els.settingsDialog.showModal();
  }

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((item) => item.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((item) => item.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(`${tab.dataset.tab}Panel`).classList.add("active");
      if (tab.dataset.tab === "trend") renderWeightChart();
    });
  });

  document.querySelectorAll("[data-range]").forEach((button) => {
    button.addEventListener("click", () => {
      chartRange = Number(button.dataset.range);
      document.querySelectorAll("[data-range]").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      renderWeightChart();
    });
  });

  els.workoutForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const type = els.workoutType.value;
    const minutes = Number(els.workoutMinutes.value);
    const intensity = els.workoutIntensity.value;
    const calories = estimateCalories(type, minutes, intensity, currentWeight());

    state.workouts.push({
      id: makeId(),
      date: todayKey(),
      type,
      minutes,
      intensity,
      note: els.workoutNote.value.trim(),
      calories,
      createdAt: new Date().toISOString(),
    });

    els.workoutNote.value = "";
    saveState();
    updateAchievements();
    render();
  });

  els.weightForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = Number(els.weightInput.value);
    state.weights.push({
      id: makeId(),
      date: todayKey(),
      value,
      createdAt: new Date().toISOString(),
    });
    state.profile.currentWeight = value;
    els.profileWeightInput.value = value;
    els.weightInput.value = "";
    saveState();
    updateAchievements();
    render();
  });

  document.querySelectorAll("[data-water]").forEach((button) => {
    button.addEventListener("click", () => {
      addWater(Number(button.dataset.water));
      updateAchievements();
      render();
    });
  });

  els.waterForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const amount = Number(els.waterInput.value);
    if (!amount) return;
    addWater(amount);
    els.waterInput.value = "";
    updateAchievements();
    render();
  });

  els.settingsButton.addEventListener("click", () => openSettings(false));

  els.profileForm.addEventListener("submit", (event) => {
    const isOnboarding = els.settingsDialog.dataset.onboarding === "true";
    if (event.submitter?.value === "cancel" && !isOnboarding) return;
    event.preventDefault();
    if (event.submitter?.value === "cancel" && isOnboarding) return;
    state.profile.height = Number(els.heightInput.value);
    state.profile.currentWeight = Number(els.profileWeightInput.value);
    state.profile.goal = els.goalInput.value;
    state.profile.onboarded = true;
    saveState();
    els.settingsDialog.close();
    render();
  });

  els.shareButton.addEventListener("click", async () => {
    const shareData = {
      title: "BOD 健身记录",
      text: "用 BOD 记录训练、体重和喝水，看看今天距离目标还差多少。",
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(window.location.href);
        showToast("链接已复制");
      } else {
        showToast("可以复制浏览器地址分享");
      }
    } catch {
      showToast("分享已取消");
    }
  });

  updateAchievements(false);
  render();
  if (!state.profile.onboarded) {
    setTimeout(() => openSettings(true), 250);
  }
})();
