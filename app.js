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

  const activityFactors = {
    sedentary: { label: "久坐为主", value: 1.25 },
    light: { label: "轻度活动", value: 1.4 },
    moderate: { label: "每周运动 3-5 次", value: 1.55 },
    high: { label: "高活动量", value: 1.7 },
  };

  const goalPaceOffsets = {
    fat_loss: { gentle: -250, steady: -400, fast: -550 },
    muscle_gain: { gentle: 150, steady: 250, fast: 350 },
    maintain: { gentle: 0, steady: 0, fast: 0 },
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
    schemaVersion: 2,
    profile: {
      height: 175,
      currentWeight: 70,
      goal: "fat_loss",
      activityLevel: "light",
      goalPace: "steady",
      onboarded: false,
    },
    workouts: [],
    weights: [],
    water: {},
    meals: [],
    trainingPlan: null,
    activeWorkout: null,
    achievements: {},
  };

  let state = loadState();
  saveState();
  let chartRange = 7;
  let toastTimer;
  let selectedCategory = "外卖";
  let selectedFoodId = "chicken_rice";
  let selectedPortion = 1;
  let activeExerciseName = "";
  let editingRecord = null;

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
    proteinProgress: document.getElementById("proteinProgress"),
    proteinProgressBar: document.getElementById("proteinProgressBar"),
    latestWeight: document.getElementById("latestWeight"),
    recommendationText: document.getElementById("recommendationText"),
    achievementGrid: document.getElementById("achievementGrid"),
    achievementCount: document.getElementById("achievementCount"),
    achievementToast: document.getElementById("achievementToast"),
    shareButton: document.getElementById("shareButton"),
    copyEmailButton: document.getElementById("copyEmailButton"),
    installGuide: document.getElementById("installGuide"),
    installPlatform: document.getElementById("installPlatform"),
    installTitle: document.getElementById("installTitle"),
    installText: document.getElementById("installText"),
    installSteps: document.getElementById("installSteps"),
    foodCategories: document.getElementById("foodCategories"),
    foodGrid: document.getElementById("foodGrid"),
    selectedFoodLabel: document.getElementById("selectedFoodLabel"),
    portionOptions: document.getElementById("portionOptions"),
    portionLabel: document.getElementById("portionLabel"),
    estimatedCalories: document.getElementById("estimatedCalories"),
    estimatedProtein: document.getElementById("estimatedProtein"),
    mealForm: document.getElementById("mealForm"),
    mealDate: document.getElementById("mealDate"),
    mealName: document.getElementById("mealName"),
    mealCalories: document.getElementById("mealCalories"),
    mealProtein: document.getElementById("mealProtein"),
    mealCount: document.getElementById("mealCount"),
    mealList: document.getElementById("mealList"),
    workoutForm: document.getElementById("workoutForm"),
    workoutDate: document.getElementById("workoutDate"),
    workoutType: document.getElementById("workoutType"),
    workoutMinutes: document.getElementById("workoutMinutes"),
    workoutIntensity: document.getElementById("workoutIntensity"),
    workoutNote: document.getElementById("workoutNote"),
    workoutCount: document.getElementById("workoutCount"),
    workoutList: document.getElementById("workoutList"),
    weightForm: document.getElementById("weightForm"),
    weightDate: document.getElementById("weightDate"),
    weightInput: document.getElementById("weightInput"),
    weightList: document.getElementById("weightList"),
    weightTrendLabel: document.getElementById("weightTrendLabel"),
    waterForm: document.getElementById("waterForm"),
    waterDate: document.getElementById("waterDate"),
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
    activityInput: document.getElementById("activityInput"),
    goalPaceInput: document.getElementById("goalPaceInput"),
    weightChart: document.getElementById("weightChart"),
    weekCalories: document.getElementById("weekCalories"),
    calorieBars: document.getElementById("calorieBars"),
    planForm: document.getElementById("planForm"),
    planDays: document.getElementById("planDays"),
    planGoal: document.getElementById("planGoal"),
    planLevel: document.getElementById("planLevel"),
    planEquipment: document.getElementById("planEquipment"),
    planBadge: document.getElementById("planBadge"),
    planSummary: document.getElementById("planSummary"),
    overloadText: document.getElementById("overloadText"),
    exerciseLibrary: document.getElementById("exerciseLibrary"),
    exerciseHint: document.getElementById("exerciseHint"),
    exerciseHistoryTitle: document.getElementById("exerciseHistoryTitle"),
    exerciseHistorySummary: document.getElementById("exerciseHistorySummary"),
    exerciseHistoryList: document.getElementById("exerciseHistoryList"),
    exerciseName: document.getElementById("exerciseName"),
    exerciseWeight: document.getElementById("exerciseWeight"),
    exerciseSets: document.getElementById("exerciseSets"),
    exerciseReps: document.getElementById("exerciseReps"),
    exerciseRpe: document.getElementById("exerciseRpe"),
    exerciseForm: document.getElementById("exerciseForm"),
    sessionExerciseList: document.getElementById("sessionExerciseList"),
    sessionSetCount: document.getElementById("sessionSetCount"),
    finishWorkoutButton: document.getElementById("finishWorkoutButton"),
    weeklySummary: document.getElementById("weeklySummary"),
    weeklyStreak: document.getElementById("weeklyStreak"),
    weeklyAdvice: document.getElementById("weeklyAdvice"),
    recordDialog: document.getElementById("recordDialog"),
    recordEditForm: document.getElementById("recordEditForm"),
    recordEditFields: document.getElementById("recordEditFields"),
    recordDialogTitle: document.getElementById("recordDialogTitle"),
    recordDialogClose: document.getElementById("recordDialogClose"),
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
        trainingPlan: saved.trainingPlan || null,
        activeWorkout: saved.activeWorkout && typeof saved.activeWorkout === "object" ? saved.activeWorkout : null,
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

  function compareRecordsAsc(a, b) {
    return a.date.localeCompare(b.date) || String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
  }

  function compareRecordsDesc(a, b) {
    return compareRecordsAsc(b, a);
  }

  function latestWeightRecord() {
    return [...state.weights].sort(compareRecordsDesc)[0];
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
      .sort(compareRecordsAsc);
  }

  function dailyWeightAverages(days = 14) {
    const cutoff = dateOffset(days - 1);
    const grouped = new Map();
    state.weights
      .filter((item) => item.date >= cutoff)
      .forEach((item) => {
        const values = grouped.get(item.date) || [];
        values.push(Number(item.value));
        grouped.set(item.date, values);
      });
    return [...grouped.entries()]
      .map(([date, values]) => ({ date, value: values.reduce((sum, value) => sum + value, 0) / values.length }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  function adaptiveWeightChange() {
    const daily = dailyWeightAverages(14);
    const recentCutoff = dateOffset(6);
    const previousCutoff = dateOffset(13);
    const recent = daily.filter((item) => item.date >= recentCutoff);
    const previous = daily.filter((item) => item.date >= previousCutoff && item.date < recentCutoff);
    if (daily.length < 10 || recent.length < 4 || previous.length < 4) {
      return { ready: false, change: 0, recordedDays: daily.length };
    }
    const average = (items) => items.reduce((sum, item) => sum + item.value, 0) / items.length;
    return { ready: true, change: average(recent) - average(previous), recordedDays: daily.length };
  }

  function dietPlan() {
    const weight = currentWeight();
    const height = Number(state.profile.height) || 175;
    const activity = activityFactors[state.profile.activityLevel] || activityFactors.light;
    const estimatedBmr = 10 * weight + 6.25 * height - 228;
    const maintenance = Math.round((estimatedBmr * activity.value) / 10) * 10;
    const goal = state.profile.goal;
    const trend = adaptiveWeightChange();
    const change = trend.change;
    const pace = state.profile.goalPace || "steady";
    const goalOffset = goalPaceOffsets[goal]?.[pace] ?? goalInfo().dietOffset;
    let adjustment = 0;
    let reason = `按${activity.label}和${goalInfo().label}目标估算。继续记录体重，满 10 个有效记录日后自动校准。`;

    if (goal === "fat_loss") {
      if (trend.ready && change > -0.15) {
        adjustment = -100;
        reason = "两个 7 日体重均值下降不明显，摄入目标下调 100 kcal。";
      } else if (trend.ready && change < -0.9) {
        adjustment = 100;
        reason = "两个 7 日体重均值下降偏快，摄入目标上调 100 kcal。";
      }
    }

    if (goal === "muscle_gain") {
      if (trend.ready && change < 0.1) {
        adjustment = 100;
        reason = "两个 7 日体重均值增长不明显，摄入目标上调 100 kcal。";
      } else if (trend.ready && change > 0.6) {
        adjustment = -100;
        reason = "两个 7 日体重均值增长偏快，摄入目标下调 100 kcal。";
      }
    }

    if (goal === "maintain") {
      if (trend.ready && change > 0.35) {
        adjustment = -100;
        reason = "两个 7 日体重均值略有上行，摄入目标下调 100 kcal。";
      } else if (trend.ready && change < -0.35) {
        adjustment = 100;
        reason = "两个 7 日体重均值略有下行，摄入目标上调 100 kcal。";
      }
    }

    if (trend.ready && adjustment === 0) reason = "两个 7 日体重均值符合目标速度，本周热量保持不变。";
    const target = Math.max(1300, Math.min(4500, maintenance + goalOffset + adjustment));
    const protein = Math.round(weight * (goal === "muscle_gain" ? 1.8 : 1.6));
    return { target, maintenance, adjustment, reason, protein, trend };
  }

  function addWater(amount, key = todayKey()) {
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
    const protein = todayProtein();
    els.proteinProgress.textContent = `${protein} / ${diet.protein}g`;
    els.proteinProgressBar.style.width = `${Math.min(100, Math.round((protein / diet.protein) * 100))}%`;
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
    const meals = [...state.meals].sort(compareRecordsDesc).slice(0, 8);
    els.mealCount.textContent = `最近 ${meals.length} 条`;
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
            <div class="record-side"><b>${item.calories} kcal</b>${recordActions("meal", item.id)}</div>
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
    const workouts = [...state.workouts].sort(compareRecordsDesc).slice(0, 10);
    els.workoutCount.textContent = `最近 ${workouts.length} 条`;
    if (!workouts.length) {
      els.workoutList.innerHTML = '<div class="empty-state">还没有训练记录</div>';
      return;
    }

    els.workoutList.innerHTML = workouts
      .map((item) => {
        const type = workoutTypes[item.type]?.label || "训练";
        const intensity = intensityMultiplier[item.intensity]?.label || "中等";
        const note = item.note ? ` · ${escapeHtml(item.note)}` : "";
        const exercises = workoutExercises(item);
        const exercise = exercises.length
          ? ` · ${exercises.map((entry) => `${escapeHtml(entry.name)} ${entry.sets.length}组`).join(" / ")}`
          : "";
        return `
          <article class="list-item">
            <div>
              <strong>${type}</strong>
              <small>${item.minutes} 分钟 · ${intensity}${exercise}${note}</small>
            </div>
            <div class="record-side"><b>${item.calories} kcal</b>${recordActions("workout", item.id)}</div>
          </article>
        `;
      })
      .join("");
  }

  function renderWeightList() {
    const weights = [...state.weights].sort(compareRecordsDesc).slice(0, 8);
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
            <div class="record-side"><b>体重</b>${recordActions("weight", item.id)}</div>
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

  function buildTrainingPlan(days, goal, level, equipment) {
    const templates = {
      muscle_gain: [
        ["推：胸肩三头", ["卧推", "肩上推举", "上斜推举", "三头下压"]],
        ["拉：背部二头", ["高位下拉", "杠铃划船", "坐姿划船", "二头弯举"]],
        ["腿臀主练", ["深蹲", "罗马尼亚硬拉", "腿举", "提踵"]],
        ["上肢容量", ["哑铃卧推", "单臂划船", "侧平举", "面拉"]],
        ["全身补弱", ["硬拉", "保加利亚分腿蹲", "俯卧撑", "平板支撑"]],
      ],
      fat_loss: [
        ["全身力量", ["深蹲", "卧推", "高位下拉", "平板支撑"]],
        ["稳态有氧", ["快走", "骑行", "死虫"]],
        ["上肢与核心", ["肩上推举", "坐姿划船", "俯卧撑", "卷腹"]],
        ["下肢与间歇", ["罗马尼亚硬拉", "箭步蹲", "登山跑"]],
        ["低强度恢复", ["快走", "臀桥", "拉伸"]],
      ],
      shape: [
        ["臀腿塑形", ["臀推", "保加利亚分腿蹲", "罗马尼亚硬拉", "髋外展"]],
        ["背肩体态", ["高位下拉", "坐姿划船", "侧平举", "面拉"]],
        ["全身线条", ["高脚杯深蹲", "哑铃卧推", "单臂划船", "平板支撑"]],
        ["核心与有氧", ["死虫", "卷腹", "登山跑", "快走"]],
        ["薄弱部位", ["臀桥", "俯卧撑", "侧平举", "提踵"]],
      ],
      strength: [
        ["深蹲主项", ["深蹲", "暂停深蹲", "腿举", "平板支撑"]],
        ["卧推动作", ["卧推", "窄距卧推", "杠铃划船", "三头下压"]],
        ["硬拉主项", ["硬拉", "罗马尼亚硬拉", "高位下拉", "臀桥"]],
        ["推举与上肢", ["肩上推举", "引体向上", "哑铃卧推", "面拉"]],
        ["技术巩固", ["深蹲", "卧推", "硬拉"]],
      ],
      recovery: [
        ["全身活动", ["高脚杯深蹲", "俯卧撑", "弹力带划船"]],
        ["低强度力量", ["臀桥", "分腿蹲", "死虫"]],
        ["轻有氧", ["快走", "骑行", "拉伸"]],
        ["核心稳定", ["鸟狗", "侧桥", "平板支撑"]],
        ["拉伸恢复", ["快走", "拉伸", "呼吸练习"]],
      ],
    };
    const replacements = {
      dumbbell: { 卧推: "哑铃卧推", 杠铃划船: "单臂哑铃划船", 高位下拉: "弹力带下拉", 腿举: "高脚杯深蹲", 三头下压: "哑铃臂屈伸", 面拉: "弹力带面拉", 深蹲: "高脚杯深蹲", 硬拉: "哑铃硬拉" },
      bodyweight: { 卧推: "俯卧撑", 哑铃卧推: "俯卧撑", 肩上推举: "倒V俯卧撑", 高位下拉: "反向划船", 坐姿划船: "反向划船", 杠铃划船: "反向划船", 深蹲: "徒手深蹲", 腿举: "箭步蹲", 硬拉: "单腿臀桥", 罗马尼亚硬拉: "单腿臀桥", 三头下压: "窄距俯卧撑", 二头弯举: "毛巾弯举", 面拉: "俯卧Y字伸展" },
    };
    const prescription = {
      beginner: { sets: 3, reps: 10, rpe: 7 },
      intermediate: { sets: 4, reps: 8, rpe: 8 },
      advanced: { sets: 4, reps: 6, rpe: 8 },
    }[level] || { sets: 4, reps: 8, rpe: 8 };
    const sessions = templates[goal] || templates.muscle_gain;
    return sessions.slice(0, Number(days)).map(([title, names], index) => ({
      day: `第 ${index + 1} 天`,
      title,
      exercises: names.map((name) => ({
        name: replacements[equipment]?.[name] || name,
        sets: goal === "recovery" ? 2 : prescription.sets,
        reps: goal === "strength" && index < 3 ? Math.max(3, prescription.reps - 3) : prescription.reps,
        rpe: goal === "recovery" ? 6 : prescription.rpe,
      })),
    }));
  }

  function renderTrainingPlan() {
    const plan = state.trainingPlan;
    if (!plan) {
      els.planBadge.textContent = "未生成";
      els.planSummary.innerHTML = '<div class="empty-state">选择目标、水平、每周次数和器械条件后生成计划。</div>';
      return;
    }

    els.planBadge.textContent = `${plan.days} 天 · ${plan.goalLabel || plan.focusLabel || "训练"}`;
    els.planSummary.innerHTML = plan.items
      .map(
        (item, index) => `
          <article class="plan-day">
            <strong>${item.day} · ${item.title}</strong>
            <small>${item.exercises?.length ? item.exercises.map((exercise) => `${escapeHtml(exercise.name)} ${exercise.sets}×${exercise.reps} RPE ${exercise.rpe}`).join(" · ") : item.detail}</small>
            ${item.exercises?.length ? `<button class="secondary-button plan-start" type="button" data-plan-day="${index}">加入今日训练</button>` : ""}
          </article>
        `,
      )
      .join("");
  }

  function workoutExercises(workout) {
    if (Array.isArray(workout.exercises)) {
      return workout.exercises.map((exercise) => ({ ...exercise, sets: Array.isArray(exercise.sets) ? exercise.sets : [] }));
    }
    if (!workout.exercise?.name) return [];
    return [{
      id: workout.exercise.id || makeId(),
      name: workout.exercise.name,
      sets: Array.from({ length: Number(workout.exercise.sets) || 1 }, () => ({
        id: makeId(),
        weight: Number(workout.exercise.weight) || 0,
        reps: Number(workout.exercise.reps) || 0,
        rpe: Number(workout.exercise.rpe) || 0,
      })),
    }];
  }

  function exerciseLogs() {
    return state.workouts
      .flatMap((workout) => workoutExercises(workout).map((exercise) => ({ ...workout, exercise })))
      .filter((item) => item.exercise.name && item.exercise.sets.some((set) => set.reps))
      .sort(compareRecordsDesc);
  }

  function exerciseRecords(name) {
    return exerciseLogs().filter((item) => item.exercise.name === name);
  }

  function exerciseNames() {
    const counts = new Map();
    exerciseLogs().forEach((item) => {
      counts.set(item.exercise.name, (counts.get(item.exercise.name) || 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name).slice(0, 8);
  }

  function latestExerciseName() {
    return activeExerciseName || els.exerciseName.value.trim() || exerciseLogs()[0]?.exercise.name || "";
  }

  function exerciseMetrics(exercise) {
    const sets = exercise.sets.filter((set) => Number(set.reps) > 0);
    const topSet = [...sets].sort((a, b) => (Number(b.weight) * (1 + Number(b.reps) / 30)) - (Number(a.weight) * (1 + Number(a.reps) / 30)))[0] || {};
    const volume = sets.reduce((sum, set) => sum + Number(set.weight || 0) * Number(set.reps || 0), 0);
    const rpes = sets.map((set) => Number(set.rpe)).filter(Boolean);
    return {
      setCount: sets.length,
      topSet,
      volume,
      averageRpe: rpes.length ? rpes.reduce((sum, value) => sum + value, 0) / rpes.length : 0,
      estimatedMax: Number(topSet.weight || 0) * (1 + Number(topSet.reps || 0) / 30),
    };
  }

  function renderExerciseLibrary() {
    const names = exerciseNames();
    if (!names.length) {
      els.exerciseLibrary.innerHTML = '<div class="empty-state">完成力量训练后，会在这里出现快捷入口。</div>';
      els.exerciseHint.textContent = "记录后会自动沉淀";
      return;
    }
    const selected = latestExerciseName();
    els.exerciseHint.textContent = selected ? `当前：${selected}` : `${names.length} 个动作`;
    els.exerciseLibrary.innerHTML = names.map((name) => {
      const latest = exerciseRecords(name)[0]?.exercise;
      const metrics = latest ? exerciseMetrics(latest) : null;
      return `
        <button class="exercise-chip ${name === selected ? "active" : ""}" type="button" data-exercise-name="${escapeHtml(name)}">
          <strong>${escapeHtml(name)}</strong>
          <span>${metrics?.topSet.weight || 0}kg × ${metrics?.topSet.reps || 0} · ${metrics?.setCount || 0} 组</span>
        </button>`;
    }).join("");
  }

  function fillExerciseFromHistory(name) {
    const latest = exerciseRecords(name)[0]?.exercise;
    activeExerciseName = name;
    els.exerciseName.value = name;
    if (!latest) return;
    const metrics = exerciseMetrics(latest);
    els.exerciseWeight.value = metrics.topSet.weight || 0;
    els.exerciseSets.value = metrics.setCount || 3;
    els.exerciseReps.value = metrics.topSet.reps || 8;
    els.exerciseRpe.value = Math.round(metrics.averageRpe) || 8;
  }

  function renderExerciseHistory() {
    const name = latestExerciseName();
    if (!name) {
      els.exerciseHistoryTitle.textContent = "最近动作";
      els.exerciseHistorySummary.textContent = "暂无记录";
      els.exerciseHistoryList.innerHTML = '<div class="empty-state">选择一个常练动作后，这里会显示表现趋势。</div>';
      return;
    }
    const records = exerciseRecords(name);
    els.exerciseHistoryTitle.textContent = name;
    if (!records.length) {
      els.exerciseHistorySummary.textContent = "新动作";
      els.exerciseHistoryList.innerHTML = '<div class="empty-state">完成一次后会生成训练容量和强度趋势。</div>';
      return;
    }
    const latest = exerciseMetrics(records[0].exercise);
    const oldest = exerciseMetrics(records[records.length - 1].exercise);
    const diff = latest.estimatedMax - oldest.estimatedMax;
    els.exerciseHistorySummary.textContent = records.length > 1 ? `${records.length} 次 · 估算力量 ${diff >= 0 ? "+" : ""}${diff.toFixed(1)}kg` : "已记录 1 次";
    els.exerciseHistoryList.innerHTML = records.slice(0, 5).map((item) => {
      const metrics = exerciseMetrics(item.exercise);
      return `
        <article class="list-item">
          <div><strong>${metrics.topSet.weight || 0}kg × ${metrics.topSet.reps || 0} · ${metrics.setCount} 组</strong><small>${item.date} · 容量 ${Math.round(metrics.volume)}kg${metrics.averageRpe ? ` · 平均 RPE ${metrics.averageRpe.toFixed(1)}` : ""}</small></div>
          <b>≈ ${metrics.estimatedMax.toFixed(1)}kg</b>
        </article>`;
    }).join("");
  }

  function renderOverload() {
    const logs = exerciseLogs();
    if (!logs.length) {
      els.overloadText.textContent = "记录动作、重量、次数和 RPE 后，BOD 会判断下次该加重量、加次数、维持还是降负荷。";
      return;
    }
    const latest = logs[0];
    const history = exerciseRecords(latest.exercise.name);
    const current = exerciseMetrics(latest.exercise);
    if (history.length < 2) {
      els.overloadText.textContent = `${latest.exercise.name} 已完成 ${current.setCount} 组，最高 ${current.topSet.weight || 0}kg × ${current.topSet.reps || 0}。下次先尝试同重量每组多 1 次。`;
      return;
    }
    const previous = exerciseMetrics(history[1].exercise);
    if (current.averageRpe >= 9.5 && current.estimatedMax <= previous.estimatedMax) {
      els.overloadText.textContent = `${latest.exercise.name} 本次压力偏高且表现未提升。下次建议降低 5-10% 重量或减少 1 组，把 RPE 控制在 7-8。`;
    } else if (current.estimatedMax > previous.estimatedMax * 1.015 && current.averageRpe <= 8.5) {
      const step = Number(current.topSet.weight) < 40 ? "1-2.5kg" : "2.5-5kg";
      els.overloadText.textContent = `${latest.exercise.name} 的估算力量和训练容量正在提升。下次可加 ${step}，或保持重量每组多做 1 次。`;
    } else {
      els.overloadText.textContent = `${latest.exercise.name} 最近表现稳定。下次保持 ${current.topSet.weight || 0}kg，优先让全部组达到 ${Number(current.topSet.reps || 0) + 1} 次且 RPE 不超过 8。`;
    }
  }

  function recordActions(kind, id) {
    return `
      <div class="record-actions">
        <button type="button" data-edit-kind="${kind}" data-record-id="${id}">编辑</button>
        <button type="button" data-delete-kind="${kind}" data-record-id="${id}">删除</button>
      </div>`;
  }

  function ensureActiveWorkout() {
    if (!state.activeWorkout) {
      state.activeWorkout = {
        date: els.workoutDate.value || todayKey(),
        type: els.workoutType.value || "strength",
        minutes: Number(els.workoutMinutes.value) || 45,
        intensity: els.workoutIntensity.value || "moderate",
        note: els.workoutNote.value.trim(),
        exercises: [],
      };
    }
    if (!Array.isArray(state.activeWorkout.exercises)) state.activeWorkout.exercises = [];
    return state.activeWorkout;
  }

  function syncActiveWorkoutMeta() {
    const draft = ensureActiveWorkout();
    draft.date = els.workoutDate.value || todayKey();
    draft.type = els.workoutType.value;
    draft.minutes = Number(els.workoutMinutes.value) || 45;
    draft.intensity = els.workoutIntensity.value;
    draft.note = els.workoutNote.value.trim();
    saveState();
  }

  function renderActiveWorkout() {
    const draft = state.activeWorkout;
    const exercises = draft?.exercises || [];
    const setCount = exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0);
    els.sessionSetCount.textContent = `${exercises.length} 个动作 · ${setCount} 组`;
    els.finishWorkoutButton.textContent = exercises.length ? "完成并保存训练" : "保存本次训练";
    if (!exercises.length) {
      els.sessionExerciseList.innerHTML = '<div class="empty-state">力量训练可添加多个动作；有氧训练可以直接保存。</div>';
      return;
    }
    els.sessionExerciseList.innerHTML = exercises.map((exercise) => `
      <article class="session-exercise">
        <div class="session-exercise-head">
          <strong>${escapeHtml(exercise.name)}</strong>
          <button type="button" data-remove-exercise="${exercise.id}" aria-label="移除 ${escapeHtml(exercise.name)}">删除动作</button>
        </div>
        <details class="session-sets">
          <summary>${exercise.sets.length} 组 · ${exercise.sets[0]?.weight || 0}kg × ${exercise.sets[0]?.reps || 0} · RPE ${exercise.sets[0]?.rpe || "-"}</summary>
          <div class="set-list">
            ${exercise.sets.map((set, index) => `
              <div class="set-row">
                <span>第 ${index + 1} 组</span>
                <label>kg<input type="number" min="0" max="500" step="0.5" value="${set.weight || 0}" data-set-field="weight" data-set-id="${set.id}" data-exercise-id="${exercise.id}" /></label>
                <label>次<input type="number" min="1" max="100" value="${set.reps || 1}" data-set-field="reps" data-set-id="${set.id}" data-exercise-id="${exercise.id}" /></label>
                <label>RPE<select data-set-field="rpe" data-set-id="${set.id}" data-exercise-id="${exercise.id}">${[6, 7, 8, 9, 10].map((value) => `<option value="${value}" ${Number(set.rpe) === value ? "selected" : ""}>${value}</option>`).join("")}</select></label>
                <button type="button" data-remove-set="${set.id}" data-exercise-id="${exercise.id}" aria-label="删除第 ${index + 1} 组">×</button>
              </div>`).join("")}
          </div>
        </details>
      </article>`).join("");
  }

  function startPlanDay(index) {
    const item = state.trainingPlan?.items?.[index];
    if (!item?.exercises?.length) return;
    const draft = ensureActiveWorkout();
    draft.type = "strength";
    draft.exercises = item.exercises.map((planned) => {
      const previous = exerciseRecords(planned.name)[0]?.exercise;
      const previousMetrics = previous ? exerciseMetrics(previous) : null;
      const weight = Number(previousMetrics?.topSet.weight || 0);
      return {
        id: makeId(),
        name: planned.name,
        sets: Array.from({ length: planned.sets }, () => ({ id: makeId(), weight, reps: planned.reps, rpe: planned.rpe })),
      };
    });
    state.activeWorkout = draft;
    saveState();
    restoreActiveWorkoutFields();
    renderActiveWorkout();
    setTrainingView("today");
    showToast("计划已加入今日训练");
  }

  function restoreActiveWorkoutFields() {
    const draft = state.activeWorkout;
    els.workoutDate.value = draft?.date || todayKey();
    els.workoutType.value = draft?.type || "strength";
    els.workoutMinutes.value = draft?.minutes || 45;
    els.workoutIntensity.value = draft?.intensity || "moderate";
    els.workoutNote.value = draft?.note || "";
  }

  function setTrainingView(view) {
    document.querySelectorAll("[data-training-view]").forEach((button) => button.classList.toggle("active", button.dataset.trainingView === view));
    document.querySelectorAll("[data-training-panel]").forEach((panel) => panel.classList.toggle("active", panel.dataset.trainingPanel === view));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function weeklyStreak() {
    const activeDates = new Set([
      ...state.workouts.map((item) => item.date),
      ...state.meals.map((item) => item.date),
      ...state.weights.map((item) => item.date),
      ...Object.keys(state.water).filter((date) => Number(state.water[date]) > 0),
    ]);
    let streak = 0;
    const startOffset = activeDates.has(todayKey()) ? 0 : 1;
    while (activeDates.has(dateOffset(startOffset + streak))) streak += 1;
    return streak;
  }

  function renderWeeklySummary() {
    const cutoff = dateOffset(6);
    const workouts = state.workouts.filter((item) => item.date >= cutoff);
    const minutes = workouts.reduce((sum, item) => sum + Number(item.minutes || 0), 0);
    const volume = workouts.flatMap(workoutExercises).reduce((sum, exercise) => sum + exerciseMetrics(exercise).volume, 0);
    const rpes = workouts.flatMap(workoutExercises).flatMap((exercise) => exercise.sets.map((set) => Number(set.rpe)).filter(Boolean));
    const averageRpe = rpes.length ? rpes.reduce((sum, value) => sum + value, 0) / rpes.length : 0;
    const proteinDays = Array.from({ length: 7 }, (_, index) => dateOffset(index)).filter((date) => {
      const protein = state.meals.filter((item) => item.date === date).reduce((sum, item) => sum + Number(item.protein || 0), 0);
      return protein >= dietPlan().protein * 0.85;
    }).length;
    els.weeklyStreak.textContent = `连续 ${weeklyStreak()} 天`;
    els.weeklySummary.innerHTML = [
      ["训练次数", `${workouts.length} 次`],
      ["训练时长", `${minutes} 分钟`],
      ["力量容量", `${Math.round(volume)} kg`],
      ["蛋白达标", `${proteinDays} 天`],
    ].map(([label, value]) => `<article><span>${label}</span><strong>${value}</strong></article>`).join("");
    if (!workouts.length) els.weeklyAdvice.textContent = "本周还没有训练记录，从一次 20-30 分钟的轻量训练开始。";
    else if (workouts.length >= 5 || averageRpe >= 9) els.weeklyAdvice.textContent = "本周训练压力偏高，下一次优先安排恢复、拉伸或降低 5-10% 负荷。";
    else els.weeklyAdvice.textContent = `本周已完成 ${workouts.length} 次训练，平均 RPE ${averageRpe ? averageRpe.toFixed(1) : "未记录"}。保持动作质量，再逐步增加重量或次数。`;
  }

  function render() {
    renderSummary();
    renderAchievements();
    renderFoodPicker();
    renderMealList();
    renderTrainingPlan();
    renderOverload();
    renderExerciseLibrary();
    renderExerciseHistory();
    renderActiveWorkout();
    renderWorkoutList();
    renderWeightList();
    renderWeightChart();
    renderCalorieBars();
    renderWeeklySummary();
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function openRecordEditor(kind, id) {
    const collections = { meal: state.meals, workout: state.workouts, weight: state.weights };
    const record = collections[kind]?.find((item) => item.id === id);
    if (!record) return;
    editingRecord = { kind, id };
    const dateField = `<label>日期<input name="date" type="date" value="${record.date}" required /></label>`;
    if (kind === "meal") {
      els.recordDialogTitle.textContent = "编辑饮食";
      els.recordEditFields.innerHTML = `${dateField}
        <label>食物名称<input name="name" type="text" maxlength="40" value="${escapeHtml(record.name)}" required /></label>
        <div class="inline-fields"><label>热量 kcal<input name="calories" type="number" min="1" max="5000" value="${record.calories}" required /></label><label>蛋白质 g<input name="protein" type="number" min="0" max="300" value="${record.protein || 0}" /></label></div>`;
    } else if (kind === "weight") {
      els.recordDialogTitle.textContent = "编辑体重";
      els.recordEditFields.innerHTML = `${dateField}<label>体重 kg<input name="value" type="number" min="20" max="300" step="0.1" value="${record.value}" required /></label>`;
    } else {
      els.recordDialogTitle.textContent = "编辑训练";
      els.recordEditFields.innerHTML = `${dateField}
        <label>训练类型<select name="type">${Object.entries(workoutTypes).map(([value, meta]) => `<option value="${value}" ${record.type === value ? "selected" : ""}>${meta.label}</option>`).join("")}</select></label>
        <div class="inline-fields"><label>时长<input name="minutes" type="number" min="1" max="360" value="${record.minutes}" required /></label><label>强度<select name="intensity">${Object.entries(intensityMultiplier).map(([value, meta]) => `<option value="${value}" ${record.intensity === value ? "selected" : ""}>${meta.label}</option>`).join("")}</select></label></div>
        <label>备注<input name="note" type="text" maxlength="80" value="${escapeHtml(record.note || "")}" /></label>`;
    }
    els.recordDialog.showModal();
  }

  function saveEditedRecord(form) {
    if (!editingRecord) return;
    const collections = { meal: state.meals, workout: state.workouts, weight: state.weights };
    const record = collections[editingRecord.kind]?.find((item) => item.id === editingRecord.id);
    if (!record) return;
    const data = Object.fromEntries(new FormData(form));
    record.date = data.date;
    if (editingRecord.kind === "meal") {
      record.name = data.name.trim();
      record.calories = Number(data.calories);
      record.protein = Number(data.protein) || 0;
    } else if (editingRecord.kind === "weight") {
      record.value = Number(data.value);
      state.profile.currentWeight = latestWeightRecord()?.value || record.value;
    } else {
      record.type = data.type;
      record.minutes = Number(data.minutes);
      record.intensity = data.intensity;
      record.note = data.note.trim();
      record.calories = estimateWorkoutCalories(record.type, record.minutes, record.intensity, currentWeight());
    }
    saveState();
    els.recordDialog.close();
    editingRecord = null;
    updateAchievements(false);
    render();
    showToast("记录已修改");
  }

  function deleteRecord(kind, id) {
    const key = { meal: "meals", workout: "workouts", weight: "weights" }[kind];
    if (!key || !window.confirm("确认删除这条记录吗？")) return;
    state[key] = state[key].filter((item) => item.id !== id);
    if (kind === "weight") state.profile.currentWeight = latestWeightRecord()?.value || state.profile.currentWeight;
    saveState();
    updateAchievements(false);
    render();
    showToast("记录已删除");
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
    els.activityInput.value = state.profile.activityLevel || "light";
    els.goalPaceInput.value = state.profile.goalPace || "steady";
    els.settingsDialog.dataset.onboarding = isOnboarding ? "true" : "false";
    els.settingsDialog.showModal();
  }

  function renderInstallGuide() {
    const ua = navigator.userAgent || "";
    const isStandalone = window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone;
    const isIOS = /iphone|ipad|ipod/i.test(ua);
    const isAndroid = /android/i.test(ua);
    const isChrome = /chrome|crios/i.test(ua) && !/edg/i.test(ua);
    const isSafari = /safari/i.test(ua) && !/chrome|crios|android/i.test(ua);
    let guide;

    if (isStandalone) {
      guide = {
        platform: "已安装",
        title: "BOD 已在桌面模式运行",
        text: "之后可以直接从桌面图标打开。",
        steps: ["继续记录饮食、训练、体重和喝水。"],
      };
    } else if (isIOS) {
      guide = {
        platform: isSafari ? "iPhone / Safari" : "iPhone",
        title: "添加到 iPhone 主屏幕",
        text: "iPhone 需要使用 Safari 的分享菜单添加。",
        steps: ["用 Safari 打开这个网页。", "点击底部分享按钮。", "选择“添加到主屏幕”。", "点击“添加”。"],
      };
    } else if (isAndroid) {
      guide = {
        platform: isChrome ? "Android / Chrome" : "Android",
        title: "添加到 Android 桌面",
        text: "Android 浏览器通常会在菜单里提供安装入口。",
        steps: ["点击浏览器右上角菜单。", "选择“安装应用”或“添加到主屏幕”。", "确认后从桌面图标打开 BOD。"],
      };
    } else {
      guide = {
        platform: "桌面浏览器",
        title: "安装为桌面应用",
        text: "如果浏览器支持 PWA，可以从地址栏或菜单安装。",
        steps: ["查看地址栏右侧是否有安装图标。", "或打开浏览器菜单，选择“安装”或“添加到主屏幕”。"],
      };
    }

    els.installPlatform.textContent = guide.platform;
    els.installTitle.textContent = guide.title;
    els.installText.textContent = guide.text;
    els.installSteps.innerHTML = guide.steps.map((step) => `<li>${step}</li>`).join("");
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

  document.querySelectorAll("[data-page-target]").forEach((button) => {
    button.addEventListener("click", () => {
      const page = button.dataset.pageTarget;
      document.querySelectorAll("[data-page-target]").forEach((item) => item.classList.remove("active"));
      document.querySelectorAll(".app-page").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      document.querySelector(`[data-page="${page}"]`)?.classList.add("active");
      window.scrollTo({ top: 0, behavior: "smooth" });
      if (page === "progress") renderWeightChart();
    });
  });

  document.querySelectorAll("[data-training-view]").forEach((button) => {
    button.addEventListener("click", () => setTrainingView(button.dataset.trainingView));
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
      date: els.mealDate.value || todayKey(),
      name: manualName || estimate.name,
      calories: manualCalories || customEstimate.calories,
      protein: manualProtein || customEstimate.protein,
      source: manualCalories || manualProtein ? "manual" : manualName ? "name_estimate" : "estimate",
      portion: selectedPortion,
      createdAt: new Date().toISOString(),
    });
    els.mealForm.reset();
    els.mealDate.value = todayKey();
    saveState();
    updateAchievements();
    render();
  });

  els.planForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const days = Number(els.planDays.value);
    const goal = els.planGoal.value;
    const level = els.planLevel.value;
    const equipment = els.planEquipment.value;
    const goalLabel = els.planGoal.selectedOptions[0]?.textContent || "增肌";
    const levelLabel = els.planLevel.selectedOptions[0]?.textContent || "有基础";
    const equipmentLabel = els.planEquipment.selectedOptions[0]?.textContent || "健身房";
    state.trainingPlan = {
      days,
      goal,
      goalLabel,
      level,
      levelLabel,
      equipment,
      equipmentLabel,
      items: buildTrainingPlan(days, goal, level, equipment),
      updatedAt: new Date().toISOString(),
    };
    saveState();
    renderTrainingPlan();
    showToast("训练计划已生成");
  });

  els.planSummary.addEventListener("click", (event) => {
    const button = event.target.closest("[data-plan-day]");
    if (!button) return;
    startPlanDay(Number(button.dataset.planDay));
  });

  els.exerciseLibrary.addEventListener("click", (event) => {
    const button = event.target.closest("[data-exercise-name]");
    if (!button) return;
    fillExerciseFromHistory(button.dataset.exerciseName);
    renderExerciseLibrary();
    renderExerciseHistory();
    showToast("已填入上次记录");
  });

  els.exerciseName.addEventListener("input", () => {
    activeExerciseName = els.exerciseName.value.trim();
  });

  els.workoutForm.addEventListener("submit", (event) => {
    event.preventDefault();
    syncActiveWorkoutMeta();
  });

  [els.workoutDate, els.workoutType, els.workoutMinutes, els.workoutIntensity, els.workoutNote].forEach((input) => {
    input.addEventListener("change", syncActiveWorkoutMeta);
  });

  els.exerciseForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const exerciseName = els.exerciseName.value.trim();
    if (!exerciseName) {
      showToast("请先填写动作名称");
      return;
    }
    syncActiveWorkoutMeta();
    const draft = ensureActiveWorkout();
    let exercise = draft.exercises.find((item) => item.name === exerciseName);
    if (!exercise) {
      exercise = { id: makeId(), name: exerciseName, sets: [] };
      draft.exercises.push(exercise);
    }
    const setCount = Number(els.exerciseSets.value) || 1;
    for (let index = 0; index < setCount; index += 1) {
      exercise.sets.push({
        id: makeId(),
        weight: Number(els.exerciseWeight.value) || 0,
        reps: Number(els.exerciseReps.value) || 0,
        rpe: Number(els.exerciseRpe.value) || 0,
      });
    }
    activeExerciseName = exerciseName;
    els.exerciseName.value = "";
    saveState();
    renderActiveWorkout();
    showToast(`已添加 ${setCount} 组`);
  });

  els.sessionExerciseList.addEventListener("click", (event) => {
    const setButton = event.target.closest("[data-remove-set]");
    const exerciseButton = event.target.closest("[data-remove-exercise]");
    const draft = ensureActiveWorkout();
    if (setButton) {
      const exercise = draft.exercises.find((item) => item.id === setButton.dataset.exerciseId);
      if (exercise) exercise.sets = exercise.sets.filter((set) => set.id !== setButton.dataset.removeSet);
      draft.exercises = draft.exercises.filter((item) => item.sets.length);
    } else if (exerciseButton) {
      draft.exercises = draft.exercises.filter((item) => item.id !== exerciseButton.dataset.removeExercise);
    } else {
      return;
    }
    saveState();
    renderActiveWorkout();
  });

  els.sessionExerciseList.addEventListener("input", (event) => {
    const input = event.target.closest("[data-set-field]");
    if (!input) return;
    const draft = ensureActiveWorkout();
    const exercise = draft.exercises.find((item) => item.id === input.dataset.exerciseId);
    const set = exercise?.sets.find((item) => item.id === input.dataset.setId);
    if (!set) return;
    set[input.dataset.setField] = Number(input.value) || 0;
    saveState();
  });

  els.finishWorkoutButton.addEventListener("click", () => {
    syncActiveWorkoutMeta();
    const draft = ensureActiveWorkout();
    if (!draft.minutes) return;
    state.workouts.push({
      id: makeId(),
      date: draft.date,
      type: draft.type,
      minutes: draft.minutes,
      intensity: draft.intensity,
      note: draft.note,
      exercises: draft.exercises,
      calories: estimateWorkoutCalories(draft.type, draft.minutes, draft.intensity, currentWeight()),
      createdAt: new Date().toISOString(),
    });
    state.activeWorkout = null;
    activeExerciseName = draft.exercises[0]?.name || activeExerciseName;
    restoreActiveWorkoutFields();
    saveState();
    updateAchievements();
    render();
    setTrainingView("history");
    showToast("训练已完成");
  });

  els.weightForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = Number(els.weightInput.value);
    state.weights.push({
      id: makeId(),
      date: els.weightDate.value || todayKey(),
      value,
      createdAt: new Date().toISOString(),
    });
    state.profile.currentWeight = latestWeightRecord()?.value || value;
    els.profileWeightInput.value = state.profile.currentWeight;
    els.weightInput.value = "";
    els.weightDate.value = todayKey();
    saveState();
    updateAchievements();
    render();
  });

  document.querySelectorAll("[data-water]").forEach((button) => {
    button.addEventListener("click", () => {
      addWater(Number(button.dataset.water), els.waterDate.value || todayKey());
      updateAchievements();
      render();
    });
  });

  els.waterForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const amount = Number(els.waterInput.value);
    if (!amount) return;
    addWater(amount, els.waterDate.value || todayKey());
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
    state.profile.activityLevel = els.activityInput.value;
    state.profile.goalPace = els.goalPaceInput.value;
    state.profile.onboarded = true;
    saveState();
    els.settingsDialog.close();
    render();
  });

  document.addEventListener("click", (event) => {
    const editButton = event.target.closest("[data-edit-kind]");
    const deleteButton = event.target.closest("[data-delete-kind]");
    if (editButton) openRecordEditor(editButton.dataset.editKind, editButton.dataset.recordId);
    if (deleteButton) deleteRecord(deleteButton.dataset.deleteKind, deleteButton.dataset.recordId);
  });

  els.recordEditForm.addEventListener("submit", (event) => {
    event.preventDefault();
    saveEditedRecord(els.recordEditForm);
  });

  els.recordDialogClose.addEventListener("click", () => {
    editingRecord = null;
    els.recordDialog.close();
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

  els.mealDate.value = todayKey();
  els.weightDate.value = todayKey();
  els.waterDate.value = todayKey();
  restoreActiveWorkoutFields();
  updateAchievements(false);
  renderInstallGuide();
  render();
  if (!state.profile.onboarded) {
    setTimeout(() => openSettings(true), 250);
  }
})();
