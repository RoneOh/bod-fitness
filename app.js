(function () {
  const STORAGE_KEY = "bod.fitness.data";
  const LEGACY_KEYS = ["bod.fitness.mvp.v3", "bod.fitness.mvp.v2", "bod.fitness.mvp.v1"];
  const todayKey = () => dateKey(new Date());
  const dateKey = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
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
    fat_loss: { label: "减脂", trainTarget: 420, dietOffset: -400 },
    muscle_gain: { label: "增肌", trainTarget: 280, dietOffset: 250 },
    maintain: { label: "保持", trainTarget: 320, dietOffset: 0 },
  };

  const foodLibrary = [
    { id: "chicken_rice", category: "外卖", name: "鸡胸饭", calories: 650, protein: 42 },
    { id: "beef_rice", category: "外卖", name: "牛肉饭", calories: 720, protein: 36 },
    { id: "light_salad", category: "外卖", name: "轻食沙拉", calories: 430, protein: 28 },
    { id: "hotpot", category: "外卖", name: "火锅一餐", calories: 900, protein: 45 },
    { id: "egg", category: "蛋白质", name: "鸡蛋 2 个", calories: 140, protein: 12 },
    { id: "protein_shake", category: "蛋白质", name: "蛋白粉 1 勺", calories: 120, protein: 24 },
    { id: "chicken_breast", category: "蛋白质", name: "鸡胸肉 150g", calories: 250, protein: 38 },
    { id: "tofu", category: "蛋白质", name: "豆腐一份", calories: 180, protein: 16 },
    { id: "rice", category: "主食", name: "米饭一碗", calories: 230, protein: 5 },
    { id: "oats", category: "主食", name: "燕麦一碗", calories: 260, protein: 9 },
    { id: "sweet_potato", category: "主食", name: "红薯一个", calories: 180, protein: 3 },
    { id: "noodles", category: "主食", name: "面条一碗", calories: 520, protein: 18 },
    { id: "milk", category: "饮品", name: "牛奶一杯", calories: 150, protein: 8 },
    { id: "latte", category: "饮品", name: "拿铁一杯", calories: 220, protein: 10 },
    { id: "milk_tea", category: "饮品", name: "奶茶一杯", calories: 450, protein: 5 },
    { id: "banana", category: "加餐", name: "香蕉一根", calories: 110, protein: 1 },
    { id: "nuts", category: "加餐", name: "坚果一把", calories: 180, protein: 5 },
    { id: "yogurt", category: "加餐", name: "酸奶一杯", calories: 160, protein: 8 },
  ];

  const foodCategories = ["外卖", "蛋白质", "主食", "饮品", "加餐"];

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
    meals: [],
    achievements: {},
  };

  let state = loadState();
  saveState();
  let chartRange = 7;
  let toastTimer;
  let selectedCategory = "外卖";
  let selectedFoodId = "chicken_rice";
  let selectedPortion = 1;

  const els = {
    goalButtonLabel: document.getElementById("goalButtonLabel"),
    goalHint: document.getElementById("goalHint"),
    goalRing: document.getElementById("goalRing"),
    goalPercent: document.getElementById("goalPercent"),
    goalRemain: document.getElementById("goalRemain"),
    targetCalories: document.getElementById("targetCalories"),
    todayCalories: document.getElementById("todayCalories"),
    todayWater: document.getElementById("todayWater"),
    todayIntake: document.getElementById("todayIntake"),
    dietTarget: document.getElementById("dietTarget"),
    dietTargetLarge: document.getElementById("dietTargetLarge"),
    dietReason: document.getElementById("dietReason"),
    proteinTarget: document.getElementById("proteinTarget"),
    latestWeight: document.getElementById("latestWeight"),
    recommendationText: document.getElementById("recommendationText"),
    achievementGrid: document.getElementById("achievementGrid"),
    achievementCount: document.getElementById("achievementCount"),
    achievementToast: document.getElementById("achievementToast"),
    shareButton: document.getElementById("shareButton"),
    copyEmailButton: document.getElementById("copyEmailButton"),
    foodCategories: document.getElementById("foodCategories"),
    foodGrid: document.getElementById("foodGrid"),
    selectedFoodLabel: document.getElementById("selectedFoodLabel"),
    portionOptions: document.getElementById("portionOptions"),
    portionLabel: document.getElementById("portionLabel"),
    estimatedCalories: document.getElementById("estimatedCalories"),
    estimatedProtein: document.getElementById("estimatedProtein"),
    mealForm: document.getElementById("mealForm"),
    mealName: document.getElementById("mealName"),
    mealCalories: document.getElementById("mealCalories"),
    mealProtein: document.getElementById("mealProtein"),
    mealCount: document.getElementById("mealCount"),
    mealList: document.getElementById("mealList"),
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
      const raw = localStorage.getItem(STORAGE_KEY) || LEGACY_KEYS.map((key) => localStorage.getItem(key)).find(Boolean);
      const saved = JSON.parse(raw);
      if (!saved || typeof saved !== "object") return structuredClone(defaultState);
      return {
        ...structuredClone(defaultState),
        ...saved,
        profile: { ...defaultState.profile, ...(saved.profile || {}) },
        workouts: Array.isArray(saved.workouts) ? saved.workouts : [],
        weights: Array.isArray(saved.weights) ? saved.weights : [],
        meals: Array.isArray(saved.meals) ? saved.meals : [],
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

  function currentWeight() {
    return latestWeightRecord()?.value || Number(state.profile.currentWeight) || 70;
  }

  function goalInfo() {
    return goalMeta[state.profile.goal] || goalMeta.fat_loss;
  }

  function todayWorkouts() {
    return state.workouts.filter((item) => item.date === todayKey());
  }

  function todayMeals() {
    return state.meals.filter((item) => item.date === todayKey());
  }

  function latestWeightRecord() {
    return [...state.weights].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  }

  function todayWorkoutCalories() {
    return todayWorkouts().reduce((sum, item) => sum + Number(item.calories || 0), 0);
  }

  function todayIntakeCalories() {
    return todayMeals().reduce((sum, item) => sum + Number(item.calories || 0), 0);
  }

  function todayProtein() {
    return todayMeals().reduce((sum, item) => sum + Number(item.protein || 0), 0);
  }

  function totalCaloriesFor(date) {
    return state.workouts
      .filter((item) => item.date === date)
      .reduce((sum, item) => sum + Number(item.calories || 0), 0);
  }

  function totalIntakeFor(date) {
    return state.meals
      .filter((item) => item.date === date)
      .reduce((sum, item) => sum + Number(item.calories || 0), 0);
  }

  function selectedFood() {
    return foodLibrary.find((item) => item.id === selectedFoodId) || foodLibrary[0];
  }

  function estimatedMeal() {
    const food = selectedFood();
    return {
      name: food.name,
      calories: Math.round(food.calories * selectedPortion),
      protein: Math.round(food.protein * selectedPortion),
    };
  }

  function estimateCustomMeal(name) {
    const normalized = name.replace(/\s/g, "").toLowerCase();
    const rules = [
      { keys: ["鸡胸饭", "鸡肉饭", "鸡胸"], calories: 650, protein: 42 },
      { keys: ["牛肉饭", "牛肉"], calories: 720, protein: 36 },
      { keys: ["轻食", "沙拉"], calories: 430, protein: 28 },
      { keys: ["火锅", "麻辣烫"], calories: 900, protein: 45 },
      { keys: ["蛋白粉", "蛋白棒"], calories: 120, protein: 24 },
      { keys: ["鸡蛋", "水煮蛋"], calories: 140, protein: 12 },
      { keys: ["豆腐", "豆干"], calories: 180, protein: 16 },
      { keys: ["米饭", "白饭"], calories: 230, protein: 5 },
      { keys: ["燕麦"], calories: 260, protein: 9 },
      { keys: ["红薯", "地瓜"], calories: 180, protein: 3 },
      { keys: ["面条", "拉面", "拌面", "粉"], calories: 520, protein: 18 },
      { keys: ["牛奶"], calories: 150, protein: 8 },
      { keys: ["拿铁", "咖啡"], calories: 220, protein: 10 },
      { keys: ["奶茶"], calories: 450, protein: 5 },
      { keys: ["香蕉"], calories: 110, protein: 1 },
      { keys: ["坚果", "花生"], calories: 180, protein: 5 },
      { keys: ["酸奶", " yogurt"], calories: 160, protein: 8 },
      { keys: ["汉堡"], calories: 620, protein: 28 },
      { keys: ["炸鸡"], calories: 760, protein: 38 },
      { keys: ["披萨"], calories: 820, protein: 34 },
      { keys: ["包子"], calories: 260, protein: 10 },
      { keys: ["饺子"], calories: 480, protein: 22 },
      { keys: ["粥"], calories: 220, protein: 8 },
      { keys: ["面包", "吐司"], calories: 260, protein: 8 },
    ];
    const match = rules.find((rule) => rule.keys.some((key) => normalized.includes(key.toLowerCase())));
    if (match) return { name, calories: match.calories, protein: match.protein, estimatedByName: true };
    return { name, calories: 400, protein: 18, estimatedByName: true };
  }

  function estimateWorkoutCalories(type, minutes, intensity, weightKg) {
    const met = workoutTypes[type].met * intensityMultiplier[intensity].value;
    return Math.round((met * 3.5 * weightKg * minutes) / 200);
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

  function weeklyWeightChange() {
    const trend = getWeightTrend(14);
    if (trend.length < 2) return 0;
    const first = trend[0];
    const last = trend[trend.length - 1];
    const days = Math.max(1, (new Date(last.createdAt) - new Date(first.createdAt)) / 86400000);
    return ((Number(last.value) - Number(first.value)) / days) * 7;
  }

  function dietPlan() {
    const weight = currentWeight();
    const height = Number(state.profile.height) || 175;
    const maintenance = Math.round((weight * 22 + height * 3) / 10) * 10;
    const goal = state.profile.goal;
    const change = weeklyWeightChange();
    let adjustment = 0;
    let reason = "根据身高、体重和当前目标估算。";

    if (goal === "fat_loss") {
      reason = "减脂目标：以维持热量为基础，先制造温和热量缺口。";
      if (change > -0.15) {
        adjustment = -100;
        reason = "最近体重下降不明显，今日摄入目标小幅下调 100 kcal。";
      } else if (change < -0.9) {
        adjustment = 100;
        reason = "最近体重下降偏快，今日摄入目标小幅上调 100 kcal，优先保护状态。";
      }
    }

    if (goal === "muscle_gain") {
      reason = "增肌目标：在维持热量上增加小幅盈余。";
      if (change < 0.1) {
        adjustment = 100;
        reason = "最近体重增长不明显，今日摄入目标小幅上调 100 kcal。";
      } else if (change > 0.6) {
        adjustment = -100;
        reason = "最近体重增长偏快，今日摄入目标小幅下调 100 kcal。";
      }
    }

    if (goal === "maintain") {
      reason = "保持目标：围绕维持热量，让体重趋势更平稳。";
      if (change > 0.35) {
        adjustment = -100;
        reason = "最近体重略上行，今日摄入目标小幅下调 100 kcal。";
      } else if (change < -0.35) {
        adjustment = 100;
        reason = "最近体重略下行，今日摄入目标小幅上调 100 kcal。";
      }
    }

    const target = Math.max(1300, Math.min(4500, maintenance + goalInfo().dietOffset + adjustment));
    const protein = Math.round(weight * (goal === "muscle_gain" ? 1.8 : 1.6));
    return { target, maintenance, adjustment, reason, protein };
  }

  function addWater(amount) {
    const key = todayKey();
    state.water[key] = Math.max(0, Number(state.water[key] || 0) + amount);
    saveState();
    render();
  }

  function achievementDefinitions() {
    const diet = dietPlan();
    const intake = todayIntakeCalories();
    const water = Number(state.water[todayKey()] || 0);
    const hasWeightToday = state.weights.some((item) => item.date === todayKey());
    const dietDone = intake >= diet.target * 0.85 && intake <= diet.target * 1.08;

    return [
      { id: "meal_logged", title: "饮食启动", text: "记录 1 条饮食", done: todayMeals().length > 0 },
      { id: "diet_target", title: "吃到目标", text: "摄入接近今日目标", done: dietDone },
      { id: "first_workout", title: "启动训练", text: "完成 1 条训练记录", done: todayWorkouts().length > 0 },
      { id: "water_ready", title: "补水在线", text: "喝水达到 1500ml", done: water >= 1500 },
      { id: "body_check", title: "身体反馈", text: "记录今日体重", done: hasWeightToday },
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
    const diet = dietPlan();
    const intake = todayIntakeCalories();
    const remainingFood = diet.target - intake;
    const proteinGap = Math.max(0, diet.protein - todayProtein());
    const workoutCalories = todayWorkoutCalories();
    const trainGap = Math.max(0, goalInfo().trainTarget - workoutCalories);

    if (!todayMeals().length) {
      return `先记录一餐。按你的${goalInfo().label}目标，今日建议摄入约 ${diet.target} kcal。`;
    }

    if (remainingFood > 250) {
      return `今天还差约 ${remainingFood} kcal。下一餐优先补充蛋白质，蛋白质还差约 ${proteinGap}g。`;
    }

    if (remainingFood < -180) {
      return `今天已经超出约 ${Math.abs(remainingFood)} kcal。下一步保持清淡，训练目标还差 ${trainGap} kcal。`;
    }

    if (workoutCalories < goalInfo().trainTarget) {
      return `饮食接近目标了。训练消耗还差 ${trainGap} kcal，可以安排快走、力量或骑行。`;
    }

    return "今天饮食和训练都接近目标。记录体重后，BOD 会用趋势慢慢调整之后的摄入建议。";
  }

  function renderGoal() {
    const diet = dietPlan();
    const intake = todayIntakeCalories();
    const remain = diet.target - intake;
    const percent = Math.min(100, Math.round((intake / diet.target) * 100));
    const circumference = 2 * Math.PI * 50;

    els.goalButtonLabel.textContent = goalInfo().label;
    els.goalHint.textContent = diet.reason;
    els.targetCalories.textContent = goalInfo().trainTarget;
    els.dietTarget.textContent = diet.target;
    els.dietTargetLarge.textContent = diet.target;
    els.dietReason.textContent = diet.reason;
    els.proteinTarget.textContent = `${diet.protein}g`;
    els.goalPercent.textContent = `${percent}%`;
    els.goalRemain.textContent = remain > 0 ? `还差 ${remain} kcal` : `超出 ${Math.abs(remain)} kcal`;
    els.goalRing.style.strokeDasharray = `${circumference}`;
    els.goalRing.style.strokeDashoffset = `${circumference * (1 - percent / 100)}`;
  }

  function renderSummary() {
    const weight = currentWeight();
    els.todayCalories.textContent = todayWorkoutCalories();
    els.todayIntake.textContent = todayIntakeCalories();
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

  function renderMealList() {
    const meals = todayMeals().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    els.mealCount.textContent = `${meals.length} 条`;
    if (!meals.length) {
      els.mealList.innerHTML = '<div class="empty-state">还没有饮食记录</div>';
      return;
    }

    els.mealList.innerHTML = meals
      .map((item) => {
        const protein = item.protein ? ` · 蛋白质 ${item.protein}g` : "";
        return `
          <article class="list-item">
            <div>
              <strong>${escapeHtml(item.name)}</strong>
              <small>${item.date}${protein}</small>
            </div>
            <b>${item.calories} kcal</b>
          </article>
        `;
      })
      .join("");
  }

  function renderFoodPicker() {
    const meal = estimatedMeal();
    const portionText = selectedPortion === 0.5 ? "半份" : selectedPortion === 1.5 ? "大份" : "标准份";
    els.selectedFoodLabel.textContent = selectedFood().name;
    els.portionLabel.textContent = portionText;
    els.estimatedCalories.textContent = `${meal.calories} kcal`;
    els.estimatedProtein.textContent = `${meal.protein} g`;

    els.foodCategories.innerHTML = foodCategories
      .map(
        (category) => `
          <button class="${category === selectedCategory ? "active" : ""}" type="button" data-food-category="${category}">
            ${category}
          </button>
        `,
      )
      .join("");

    els.foodGrid.innerHTML = foodLibrary
      .filter((item) => item.category === selectedCategory)
      .map(
        (item) => `
          <button class="food-card ${item.id === selectedFoodId ? "active" : ""}" type="button" data-food-id="${item.id}">
            <strong>${item.name}</strong>
            <span>${item.calories} kcal · 蛋白质 ${item.protein}g</span>
          </button>
        `,
      )
      .join("");

    els.portionOptions.querySelectorAll("button").forEach((button) => {
      button.classList.toggle("active", Number(button.dataset.portion) === selectedPortion);
    });
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
    const workoutTotals = days.map((date) => totalCaloriesFor(date));
    const intakeTotals = days.map((date) => totalIntakeFor(date));
    const max = Math.max(...workoutTotals, ...intakeTotals, 1);
    const weekWorkout = workoutTotals.reduce((sum, value) => sum + value, 0);
    els.weekCalories.textContent = `本周运动 ${weekWorkout} kcal`;
    els.calorieBars.innerHTML = days
      .map((date, index) => {
        const workoutHeight = Math.max(8, Math.round((workoutTotals[index] / max) * 112));
        const intakeHeight = Math.max(8, Math.round((intakeTotals[index] / max) * 112));
        const label = date.slice(5).replace("-", "/");
        return `
          <div class="bar">
            <span class="food-bar" style="height:${intakeHeight}px"></span>
            <span style="height:${workoutHeight}px"></span>
            ${label}
          </div>
        `;
      })
      .join("");
  }

  function render() {
    renderSummary();
    renderAchievements();
    renderFoodPicker();
    renderMealList();
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
      ? "选择目标后，BOD 会给出每日饮食摄入、训练消耗和体重趋势建议。"
      : "目标会影响每日摄入目标、训练目标和行动建议。";
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

  els.foodCategories.addEventListener("click", (event) => {
    const button = event.target.closest("[data-food-category]");
    if (!button) return;
    selectedCategory = button.dataset.foodCategory;
    selectedFoodId = foodLibrary.find((item) => item.category === selectedCategory)?.id || selectedFoodId;
    renderFoodPicker();
  });

  els.foodGrid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-food-id]");
    if (!button) return;
    selectedFoodId = button.dataset.foodId;
    els.mealName.value = "";
    els.mealCalories.value = "";
    els.mealProtein.value = "";
    renderFoodPicker();
  });

  els.portionOptions.addEventListener("click", (event) => {
    const button = event.target.closest("[data-portion]");
    if (!button) return;
    selectedPortion = Number(button.dataset.portion);
    renderFoodPicker();
  });

  els.mealForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const estimate = estimatedMeal();
    const manualCalories = Number(els.mealCalories.value);
    const manualProtein = Number(els.mealProtein.value);
    const manualName = els.mealName.value.trim();
    const customEstimate = manualName ? estimateCustomMeal(manualName) : estimate;
    state.meals.push({
      id: makeId(),
      date: todayKey(),
      name: manualName || estimate.name,
      calories: manualCalories || customEstimate.calories,
      protein: manualProtein || customEstimate.protein,
      source: manualCalories || manualProtein ? "manual" : manualName ? "name_estimate" : "estimate",
      portion: selectedPortion,
      createdAt: new Date().toISOString(),
    });
    els.mealForm.reset();
    saveState();
    updateAchievements();
    render();
  });

  els.workoutForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const type = els.workoutType.value;
    const minutes = Number(els.workoutMinutes.value);
    const intensity = els.workoutIntensity.value;
    const calories = estimateWorkoutCalories(type, minutes, intensity, currentWeight());

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
    const shareText = `BOD 健身记录：记录训练、饮食、体重和喝水，看看今天距离目标还差多少。\n${window.location.href}`;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareText);
        showToast("已复制");
      } else if (navigator.share) {
        await navigator.share({ text: shareText });
        showToast("已复制");
      } else {
        showToast("复制失败");
      }
    } catch {
      showToast("复制失败");
    }
  });

  els.copyEmailButton.addEventListener("click", async () => {
    const email = "BOD8808@163.com";
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(email);
        showToast("邮箱已复制");
      } else {
        showToast(`反馈邮箱：${email}`);
      }
    } catch {
      showToast(`反馈邮箱：${email}`);
    }
  });

  updateAchievements(false);
  render();
  if (!state.profile.onboarded) {
    setTimeout(() => openSettings(true), 250);
  }
})();
