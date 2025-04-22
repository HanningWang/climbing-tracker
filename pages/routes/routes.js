const common = require('../../utils/common.js');

Component({

  /**
   * 组件的初始数据
   */
  data: {
    // 普通刷线相关数据
    activeTab: 'normal',
    typeArray: ['抱石', '先锋', '速度'],
    typeIndex: 0,
    // 分开存储不同类型的难度数组
    boulderingDifficulties: ['V0', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'V9', 'V10', 'V11', 'V12', 'V13', 'V14', 'V15', 'V16', 'V17'],
    sportDifficulties: ['5.5', '5.6', '5.7', '5.8', '5.9', '5.10a', '5.10b', '5.10c', '5.10d', '5.11a', '5.11b', '5.11c', '5.11d', '5.12a', '5.12b', '5.12c', '5.12d', '5.13a', '5.13b', '5.13c', '5.13d', '5.14a', '5.14b', '5.14c', '5.14d', '5.15a', '5.15b', '5.15c', '5.15d'],
    difficultyArray: ['V0', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'V9', 'V10', 'V11', 'V12', 'V13', 'V14', 'V15', 'V16', 'V17'], // 默认为抱石难度
    difficultyIndex: 0,
    quantity: 1,
    routesList: [],
    location: '',
    date: '',
    trainingTime: 0,
    historyRecords: [],
    filteredRecords: [],
    filterDate: '',
    
    // 游戏相关数据
    isGameRunning: false,
    gameTypeArray: ['抱石', '先锋'],
    gameTypeIndex: 0,
    gameLocation: '',
    gameDuration: 120,
    gameAttempts: 10,
    gameTimeLeft: 0,
    gameTimeDisplay: '00:00',
    gameTimer: null,
    gameRoutes: [],
    gameScore: 0,
    gameSuccessCount: 0,
    gameFailCount: 0,
    
    // 游戏记录相关
    gameRecords: [],
    filteredGameRecords: [],
    gameFilterDate: '',
    showDetailCard: false,
    currentCard: {},
    showGameDetailCard: false,
    currentGameCard: {},
    gameStartTime: 0,
    gameEndTime: 0
  },

  lifetimes: {
    attached: function() {
      this.loadRecords();
      this.loadGameRecords();
      
      // 设置默认日期为今天
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      this.setData({
        date: `${year}-${month}-${day}`
      });
      
      // 检查是否有正在进行的游戏
      this.checkForRunningGame();
      
      // 添加全局生命周期监听
      wx.onAppShow(this.handleAppShow.bind(this));
      wx.onAppHide(this.handleAppHide.bind(this));
    },
    detached: function() {
      // 组件销毁时，不要结束游戏，只清理计时器
      if (this.data.gameTimer) {
        clearInterval(this.data.gameTimer);
        this.setData({ gameTimer: null });
      }
      
      // 保存游戏状态但不结束游戏
      this.saveGameStateWithoutStopping();
      
      // 移除生命周期监听
      wx.offAppShow(this.handleAppShow);
      wx.offAppHide(this.handleAppHide);
    }
  },

  // 页面生命周期处理
  pageLifetimes: {
    show: function() {
      // 页面被显示时，检查是否有正在进行的游戏
      this.checkForRunningGame();
    },
    
    hide: function() {
      // 页面被隐藏时，保存游戏状态并暂停计时器
      if (this.data.isGameRunning) {
        this.saveGameStateWithoutStopping();
        
        if (this.data.gameTimer) {
          clearInterval(this.data.gameTimer);
          this.setData({ gameTimer: null });
        }
      }
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    switchTab(e) {
      const tab = e.currentTarget.dataset.tab;
      
      // 直接切换Tab
      this.setData({
        activeTab: tab
      });
      
      // 如果切换回游戏Tab，且游戏正在运行，恢复计时器
      if (tab === 'game' && this.data.isGameRunning && !this.data.gameTimer) {
        // 重新计算剩余时间
        const now = Date.now();
        const timeLeft = Math.max(0, Math.floor((this.data.gameEndTime - now) / 1000));
        
        if (timeLeft <= 0) {
          this.endGame();
        } else {
          // 更新剩余时间和显示
          const timeDisplay = this.formatGameTime(timeLeft);
          this.setData({ 
            gameTimeLeft: timeLeft,
            gameTimeDisplay: timeDisplay
          });
          
          // 重新启动计时器
          this.startGameTimer();
        }
      }
    },

    bindTypeChange(e) {
      const typeIndex = e.detail.value;
      
      // 根据选择的类型更新难度数组
      let difficultyArray;
      if (typeIndex == 0) { // 抱石
        difficultyArray = this.data.boulderingDifficulties;
      } else if (typeIndex == 1) { // 先锋
        difficultyArray = this.data.sportDifficulties;
      } else { // 速度
        difficultyArray = this.data.speedDifficulties;
      }
      
      this.setData({
        typeIndex: typeIndex,
        difficultyArray: difficultyArray,
        difficultyIndex: 0 // 重置难度选择
      });
    },

    bindDifficultyChange(e) {
      this.setData({
        difficultyIndex: e.detail.value
      });
    },

    bindDateChange(e) {
      this.setData({
        date: e.detail.value
      });
    },

    addToList() {
      if (!this.data.quantity || this.data.quantity <= 0) {
        wx.showToast({
          title: '请输入有效数量',
          icon: 'none'
        });
        return;
      }
      
      const type = this.data.typeArray[this.data.typeIndex];
      let newRoute;
      
      if (type === '速度') {
        // 速度类型不需要难度
        newRoute = {
          type: type,
          difficulty: '速度',  // 或者可以设为空字符串或其他默认值
          quantity: parseInt(this.data.quantity)
        };
      } else {
        // 抱石和先锋类型需要难度
        newRoute = {
          type: type,
          difficulty: this.data.difficultyArray[this.data.difficultyIndex],
          quantity: parseInt(this.data.quantity)
        };
      }
      
      const routesList = [...this.data.routesList, newRoute];
      
      this.setData({
        routesList,
        quantity: 1
      });
    },

    deleteListItem(e) {
      const index = e.currentTarget.dataset.index;
      const routesList = [...this.data.routesList];
      routesList.splice(index, 1);
      
      this.setData({
        routesList
      });
    },

    saveRecord() {
      if (this.data.routesList.length === 0) {
        wx.showToast({
          title: '请添加至少一条路线',
          icon: 'none'
        });
        return;
      }
      
      if (!this.data.location) {
        wx.showToast({
          title: '请输入地点',
          icon: 'none'
        });
        return;
      }
      
      if (!this.data.date) {
        wx.showToast({
          title: '请选择日期',
          icon: 'none'
        });
        return;
      }
      
      if (!this.data.trainingTime) {
        wx.showToast({
          title: '请输入训练时间',
          icon: 'none'
        });
        return;
      }
      
      const newRecord = {
        id: Date.now().toString(),
        location: this.data.location,
        date: this.data.date,
        trainingTime: Number(this.data.trainingTime),
        routes: this.data.routesList,
        isGame: false
      };
      
      const records = [...this.data.historyRecords, newRecord];
      const sortedRecords = common.sortRecordsByDate(records.filter(record => !record.isGame));
      
      // 保存到本地存储
      wx.setStorageSync('climbingRoutes', sortedRecords);
      
      this.setData({
        historyRecords: sortedRecords,
        filteredRecords: sortedRecords
      });
      
      this.clearForm();
      
      wx.showToast({
        title: '记录已保存',
        icon: 'success'
      });
    },

    clearForm() {
      this.setData({
        routesList: [],
        location: '',
        trainingTime: 0
      });
    },

    loadRecords() {
      const records = wx.getStorageSync('climbingRoutes') || [];
      
      this.setData({
        historyRecords: records,
        filteredRecords: records
      });
    },

    bindFilterDateChange(e) {
      const filterDate = e.detail.value;
      
      this.setData({ filterDate });
      
      this.filterRecords();
    },

    filterRecords() {
      if (!this.data.filterDate) {
        this.setData({
          filteredRecords: this.data.historyRecords
        });
        return;
      }
      
      const filtered = this.data.historyRecords.filter(record => 
        record.date === this.data.filterDate
      );
      
      this.setData({
        filteredRecords: filtered
      });
    },

    viewRecordDetail(e) {
      const id = e.currentTarget.dataset.id;
      const record = this.data.historyRecords.find(r => r.id === id);
      
      if (record) {
        this.setData({
          showDetailCard: true,
          currentCard: record
        });
      }
    },

    closeDetailCard() {
      this.setData({
        showDetailCard: false
      });
    },

    stopPropagation() {
      return;
    },

    deleteRecord(e) {
      const id = e.currentTarget.dataset.id;
      
      wx.showModal({
        title: '确认删除',
        content: '确定要删除这条记录吗？',
        success: (res) => {
          if (res.confirm) {
            // 从普通记录中删除
            const updatedRecords = this.data.historyRecords.filter(r => r.id !== id);
            
            // 获取所有记录（包括游戏记录）
            const allRecords = wx.getStorageSync('climbingRoutes') || [];
            // 保留游戏记录，删除指定的普通记录
            const updatedAllRecords = allRecords.filter(r => r.id !== id);
            
            // 更新存储
            wx.setStorageSync('climbingRoutes', updatedAllRecords);
            
            this.setData({
              historyRecords: updatedRecords
            });
            
            this.filterRecords();
            
            wx.showToast({
              title: '记录已删除',
              icon: 'success'
            });
          }
        }
      });
    },

    increaseQuantity(e) {
      const index = e.currentTarget.dataset.index;
      const routesList = [...this.data.routesList];
      routesList[index].quantity += 1;
      
      this.setData({
        routesList
      });
    },

    decreaseQuantity(e) {
      const index = e.currentTarget.dataset.index;
      const routesList = [...this.data.routesList];
      
      // 确保数量不小于1
      if (routesList[index].quantity > 1) {
        routesList[index].quantity -= 1;
        
        this.setData({
          routesList
        });
      }
    },

    // 游戏相关方法
    bindGameTypeChange(e) {
      this.setData({
        gameTypeIndex: e.detail.value
      });
    },

    startGame() {
      if (!this.data.gameLocation) {
        wx.showToast({
          title: '请输入攀岩地点',
          icon: 'none'
        });
        return;
      }
      
      // 确保 gameDuration 是数字
      const duration = parseInt(this.data.gameDuration);
      if (!duration || duration <= 0) {
        wx.showToast({
          title: '请输入有效游戏时长',
          icon: 'none'
        });
        return;
      }
      
      // 确保 gameAttempts 是数字
      const attempts = parseInt(this.data.gameAttempts);
      if (!attempts || attempts <= 0) {
        wx.showToast({
          title: '请输入有效出手次数',
          icon: 'none'
        });
        return;
      }
      
      // 设置游戏时间（分钟转秒）
      const gameTimeLeft = duration * 60;
      const now = Date.now();
      const gameEndTime = now + (gameTimeLeft * 1000);
      
      this.setData({
        gameDuration: duration, // 保存为数字
        gameAttempts: attempts, // 保存为数字
        isGameRunning: true,
        gameTimeLeft: gameTimeLeft,
        gameTimeDisplay: this.formatTime(gameTimeLeft),
        gameRoutes: [],
        gameScore: 0,
        gameSuccessCount: 0,
        gameFailCount: 0,
        gameStartTime: now,
        gameEndTime: gameEndTime
      });
      
      // 启动游戏计时器
      this.startGameTimer();
    },
    
    startGameTimer() {
      // 清除可能存在的旧计时器
      if (this.data.gameTimer) {
        clearInterval(this.data.gameTimer);
      }
      
      const gameTimer = setInterval(() => {
        // 计算剩余时间（基于当前时间和结束时间）
        const now = Date.now();
        const timeLeft = Math.max(0, Math.floor((this.data.gameEndTime - now) / 1000));
        
        if (timeLeft <= 0) {
          // 游戏时间结束
          clearInterval(this.data.gameTimer);
          
          // 自动结束游戏
          this.endGame();
        }
        
        this.setData({
          gameTimeLeft: timeLeft,
          gameTimeDisplay: this.formatTime(timeLeft)
        });
        
        // 每隔30秒保存一次游戏状态
        if (timeLeft % 30 === 0) {
          this.saveGameStateWithoutStopping();
        }
      }, 1000);
      
      this.setData({
        gameTimer: gameTimer
      });
    },
    
    formatTime(seconds) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
    },
    
    addGameRoute(e) {
      const difficulty = e.currentTarget.dataset.difficulty;
      const success = e.currentTarget.dataset.success === "true";
      console.log(success);
      
      // 计算得分
      let score = 0;
      if (success) {
        // 根据难度计算得分
        if (this.data.gameTypeArray[this.data.gameTypeIndex] === '抱石') {
          // V0-V17 得分规则
          const vGrade = parseInt(difficulty.replace('V', ''));
          score = (vGrade + 1) * 100;
        } else {
          // 5.x 得分规则 - 基于sportDifficulties数组索引
          const index = this.data.sportDifficulties.indexOf(difficulty);
          if (index !== -1) {
            score = (index + 1) * 100; // 数组中的第一个难度为100分，第二个为200分，依此类推
          }
        }
      }
      
      // 创建新的路线记录
      const newRoute = {
        difficulty: difficulty,
        success: success,
        score: score,
        timestamp: Date.now(),
        gameTime: this.data.gameTimeDisplay
      };
      
      // 更新游戏数据
      this.setData({
        gameRoutes: [...this.data.gameRoutes, newRoute],
        gameScore: this.data.gameScore + score,
        gameSuccessCount: this.data.gameSuccessCount + (success ? 1 : 0),
        gameFailCount: this.data.gameFailCount + (success ? 0 : 1)
      });
      
      // 检查是否达到出手次数上限
      if (this.data.gameRoutes.length >= this.data.gameAttempts) {
        // 自动结束游戏
        this.endGame();
      }
    },
    
    endGame() {
      // 停止计时器
      if (this.data.gameTimer) {
        clearInterval(this.data.gameTimer);
        this.setData({ gameTimer: null });
      }
      
      // 如果没有记录任何路线，直接取消游戏
      if (this.data.gameRoutes.length === 0) {
        this.cancelGame();
        return;
      }
      
      // 创建游戏记录
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      // 计算游戏实际持续时间（分钟）
      const elapsedTimeInSeconds = this.data.gameDuration * 60 - this.data.gameTimeLeft;
      const elapsedTimeInMinutes = Math.ceil(elapsedTimeInSeconds / 60);
      
      // 计算完成率
      const totalAttempts = this.data.gameSuccessCount + this.data.gameFailCount;
      const completionRate = totalAttempts > 0 
        ? Math.round((this.data.gameSuccessCount / totalAttempts) * 100) 
        : 0;
      const formattedCompletionRate = (totalAttempts > 0 
        ? (this.data.gameSuccessCount / totalAttempts * 100).toFixed(1) 
        : '0.0') + '%';
      
      const gameRecord = {
        id: Date.now().toString(),
        location: this.data.gameLocation,
        date: dateStr,
        gameDuration: this.data.gameDuration,
        gameElapsedTime: elapsedTimeInMinutes,
        actualGameTime: elapsedTimeInMinutes, // 添加实际游戏时长
        gameType: this.data.gameTypeArray[this.data.gameTypeIndex],
        gameScore: this.data.gameScore,
        gameSuccessCount: this.data.gameSuccessCount,
        gameFailCount: this.data.gameFailCount,
        gameCompletionRate: completionRate,
        formattedCompletionRate: formattedCompletionRate,
        gameRoutes: this.data.gameRoutes,
        isGame: true
      };
      
      // 保存游戏记录
      const gameRecords = [gameRecord, ...this.data.gameRecords];
      const sortedGameRecords = common.sortRecordsByDate(gameRecords);
      
      // 保存到单独的存储
      wx.setStorageSync('climbingGameRecords', sortedGameRecords);
      
      this.setData({
        gameRecords: sortedGameRecords,
        filteredGameRecords: sortedGameRecords,
        isGameRunning: false
      });
      
      // 清除保存的游戏状态
      wx.removeStorageSync('climbingGameState');
      
      wx.showToast({
        title: '游戏记录已保存',
        icon: 'success'
      });
    },
    
    cancelGame() {
      // 停止计时器
      if (this.data.gameTimer) {
        clearInterval(this.data.gameTimer);
        this.setData({ gameTimer: null });
      }
      
      // 重置游戏状态
      this.setData({
        isGameRunning: false,
        gameRoutes: [],
        gameScore: 0,
        gameSuccessCount: 0,
        gameFailCount: 0
      });
      
      // 清除保存的游戏状态
      wx.removeStorageSync('climbingGameState');
    },
    
    // 处理小程序显示事件
    handleAppShow() {
      // 小程序回到前台时，检查游戏状态
      this.checkForRunningGame();
    },
    
    // 处理小程序隐藏事件
    handleAppHide() {
      // 小程序进入后台时，保存游戏状态
      if (this.data.isGameRunning) {
        this.saveGameStateWithoutStopping();
        
        if (this.data.gameTimer) {
          clearInterval(this.data.gameTimer);
          this.setData({ gameTimer: null });
        }
      }
    },
    
    // 保存游戏状态但不停止游戏
    saveGameStateWithoutStopping() {
      if (!this.data.isGameRunning) return;
      
      const gameState = {
        gameLocation: this.data.gameLocation,
        gameTypeIndex: this.data.gameTypeIndex,
        gameDuration: this.data.gameDuration,
        gameAttempts: this.data.gameAttempts,
        gameStartTime: this.data.gameStartTime,
        gameEndTime: this.data.gameEndTime,
        gameRoutes: this.data.gameRoutes,
        gameScore: this.data.gameScore,
        gameSuccessCount: this.data.gameSuccessCount,
        gameFailCount: this.data.gameFailCount,
        lastTimestamp: Date.now()
      };
      
      wx.setStorageSync('climbingGameState', gameState);
    },
    
    // 检查是否有正在进行的游戏
    checkForRunningGame() {
      const gameState = wx.getStorageSync('climbingGameState');
      
      if (gameState) {
        // 有保存的游戏状态
        const now = Date.now();
        const endTime = gameState.gameEndTime;
        
        if (now < endTime) {
          // 游戏还在进行中
          const timeLeft = Math.max(0, Math.floor((endTime - now) / 1000));
          const timeDisplay = this.formatTime(timeLeft);
          
          // 恢复游戏状态
          this.setData({
            isGameRunning: true,
            gameLocation: gameState.gameLocation,
            gameTypeIndex: gameState.gameTypeIndex,
            gameDuration: gameState.gameDuration,
            gameAttempts: gameState.gameAttempts,
            gameStartTime: gameState.gameStartTime,
            gameEndTime: gameState.gameEndTime,
            gameTimeLeft: timeLeft,
            gameTimeDisplay: timeDisplay,
            gameRoutes: gameState.gameRoutes || [],
            gameScore: gameState.gameScore || 0,
            gameSuccessCount: gameState.gameSuccessCount || 0,
            gameFailCount: gameState.gameFailCount || 0,
            activeTab: 'game' // 自动切换到游戏标签
          });
          
          // 重新启动计时器
          this.startGameTimer();
        } else {
          // 游戏已经结束，清理状态
          this.handleExpiredGame(gameState);
        }
      }
    },
    
    // 处理已过期的游戏
    handleExpiredGame(gameState) {
      // 如果有路线记录，创建游戏记录
      if (gameState.gameRoutes && gameState.gameRoutes.length > 0) {
        // 创建游戏记录
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        
        // 计算游戏实际持续时间（分钟）
        const elapsedTimeInSeconds = gameState.gameDuration * 60;
        const elapsedTimeInMinutes = Math.ceil(elapsedTimeInSeconds / 60);
        
        // 计算完成率
        const totalAttempts = gameState.gameSuccessCount + gameState.gameFailCount;
        const completionRate = totalAttempts > 0 
          ? Math.round((gameState.gameSuccessCount / totalAttempts) * 100) 
          : 0;
        const formattedCompletionRate = (totalAttempts > 0 
          ? (gameState.gameSuccessCount / totalAttempts * 100).toFixed(1) 
          : '0.0') + '%';
        
        const gameRecord = {
          id: Date.now().toString(),
          location: gameState.gameLocation,
          date: dateStr,
          gameDuration: gameState.gameDuration,
          gameElapsedTime: elapsedTimeInMinutes,
          actualGameTime: elapsedTimeInMinutes, // 添加实际游戏时长
          gameType: this.data.gameTypeArray[gameState.gameTypeIndex],
          gameScore: gameState.gameScore,
          gameSuccessCount: gameState.gameSuccessCount,
          gameFailCount: gameState.gameFailCount,
          gameCompletionRate: completionRate,
          formattedCompletionRate: formattedCompletionRate,
          gameRoutes: gameState.gameRoutes,
          isGame: true
        };
        
        // 保存游戏记录
        const gameRecords = [...this.data.gameRecords, gameRecord];
        
        // 保存到单独的存储
        wx.setStorageSync('climbingGameRecords', gameRecords);
        
        this.setData({
          gameRecords: gameRecords,
          filteredGameRecords: gameRecords
        });
        
        wx.showToast({
          title: '游戏记录已保存',
          icon: 'success'
        });
      }
      
      // 清理存储
      wx.removeStorageSync('climbingGameState');
    },

    loadGameRecords() {
      const gameRecords = wx.getStorageSync('climbingGameRecords') || [];
      
      // 为每条记录计算格式化的完成率
      const processedRecords = gameRecords.map(record => {
        const total = record.gameSuccessCount + record.gameFailCount;
        const completionRate = total > 0 
          ? (record.gameSuccessCount / total * 100).toFixed(1) 
          : '0.0';
        
        return {
          ...record,
          formattedCompletionRate: completionRate + '%'
        };
      });
      
      this.setData({
        gameRecords: processedRecords,
        filteredGameRecords: processedRecords
      });
    },

    bindGameFilterDateChange(e) {
      const gameFilterDate = e.detail.value;
      this.setData({
        gameFilterDate: gameFilterDate
      });
      
      this.filterGameRecords();
    },

    filterGameRecords() {
      if (!this.data.gameFilterDate) {
        this.setData({
          filteredGameRecords: this.data.gameRecords
        });
        return;
      }
      
      const filtered = this.data.gameRecords.filter(record => 
        record.date === this.data.gameFilterDate
      );
      
      this.setData({
        filteredGameRecords: filtered
      });
    },

    viewGameRecordDetail(e) {
      const id = e.currentTarget.dataset.id;
      const record = this.data.gameRecords.find(r => r.id === id);
      
      if (record) {
        this.setData({
          showGameDetailCard: true,
          currentGameCard: record
        });
      }
    },

    closeGameDetailCard() {
      this.setData({
        showGameDetailCard: false
      });
    },

    deleteGameRecord(e) {
      const id = e.currentTarget.dataset.id;
      
      wx.showModal({
        title: '确认删除',
        content: '确定要删除这条游戏记录吗？',
        success: (res) => {
          if (res.confirm) {
            const updatedRecords = this.data.gameRecords.filter(r => r.id !== id);
            
            // 更新存储
            wx.setStorageSync('climbingGameRecords', updatedRecords);
            
            this.setData({
              gameRecords: updatedRecords
            });
            
            this.filterGameRecords();
            
            wx.showToast({
              title: '记录已删除',
              icon: 'success'
            });
          }
        }
      });
    },

    // 清除普通记录日期筛选
    clearDateFilter() {
      this.setData({
        filterDate: ''
      });
      this.filterRecords();
    },
    
    // 清除游戏记录日期筛选
    clearGameDateFilter() {
      this.setData({
        gameFilterDate: ''
      });
      this.filterGameRecords();
    },

    undoLastRoute() {
      // 检查是否有记录可以撤销
      if (this.data.gameRoutes.length === 0) {
        wx.showToast({
          title: '没有可撤销的记录',
          icon: 'none'
        });
        return;
      }

      // 获取最后一条记录
      const lastRoute = this.data.gameRoutes[this.data.gameRoutes.length - 1];
      
      // 显示确认对话框
      wx.showModal({
        title: '确认撤销',
        content: `确定要撤销最后一条${lastRoute.success ? '完成' : '未完成'}的${lastRoute.difficulty}记录吗？`,
        success: (res) => {
          if (res.confirm) {
            // 用户点击确定，执行撤销操作
            this.setData({
              // 移除最后一条记录
              gameRoutes: this.data.gameRoutes.slice(0, -1),
              // 减去对应的分数
              gameScore: this.data.gameScore - (lastRoute.score || 0),
              // 更新成功/失败计数
              gameSuccessCount: this.data.gameSuccessCount - (lastRoute.success ? 1 : 0),
              gameFailCount: this.data.gameFailCount - (lastRoute.success ? 0 : 1)
            });

            // 保存更新后的游戏状态
            this.saveGameStateWithoutStopping();

            wx.showToast({
              title: '已撤销最后一条记录',
              icon: 'success'
            });
          }
        }
      });
    },

    // 添加输入处理方法
    handleGameDurationInput(e) {
      // 将输入值转换为数字
      const value = parseInt(e.detail.value) || '';
      this.setData({
        gameDuration: value
      });
    },

    handleGameAttemptsInput(e) {
      // 将输入值转换为数字
      const value = parseInt(e.detail.value) || '';
      this.setData({
        gameAttempts: value
      });
    }
  }
}) 