Component({
  /**
   * 组件的属性列表
   */
  properties: {
    
  },

  /**
   * 组件的初始数据
   */
  data: {
    activeTab: 'plan', // 默认显示训练计划选项卡
    planName: '',
    planDuration: '',
    exerciseInput: '',
    exercises: [],
    trainingPlans: [],
    showPlanDetail: false,
    currentPlan: null,
    showEditExercise: false,
    editExerciseIndex: -1,
    editExerciseContent: '',
    
    // 执行训练相关数据
    selectedPlanIndex: -1,
    trainingPlanNames: [],
    selectedPlan: null,
    timerDisplay: '00:00:00',
    timerSeconds: 0,
    timerInterval: null,
    isTimerRunning: false,
    onExecution: false, // 添加训练执行状态标志
    completedExercises: [],
    trainingFeedback: '',
    trainingRecords: [],
    filteredRecords: [],
    filterDate: ''
  },

  lifetimes: {
    attached() {
      this.loadTrainingPlans();
      this.loadTrainingRecords();
      
      // 恢复计时器状态
      const timerState = wx.getStorageSync('timerState');
      if (timerState) {
        // 如果有正在进行的训练，自动切换到执行训练标签
        this.setData({ activeTab: 'execute' });
        // 延迟恢复计时器状态，确保训练计划已加载
        setTimeout(() => {
          this.restoreTimerState();
        }, 100);
      }
    },
    detached() {
      // 保存计时器状态但不停止计时
      this.saveTimerStateWithoutStopping();
      
      // 确保清除计时器，防止内存泄漏
      if (this.data.timerInterval) {
        clearInterval(this.data.timerInterval);
      }
    }
  },

  pageLifetimes: {
    // 页面隐藏时保存计时器状态，但不停止计时
    hide() {
      this.saveTimerStateWithoutStopping();
    },
    // 页面显示时恢复计时器状态
    show() {
      this.restoreTimerState();
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    // 切换选项卡
    switchTab(e) {
      const tab = e.currentTarget.dataset.tab;
      
      // 如果有正在进行的训练，保存状态但不停止计时
      if (this.data.activeTab === 'execute' && this.data.selectedPlan) {
        this.saveTimerStateWithoutStopping();
      }
      
      this.setData({
        activeTab: tab
      });
      
      // 如果切换到执行训练选项卡，更新训练计划名称列表并恢复计时器
      if (tab === 'execute') {
        this.updateTrainingPlanNames();
        this.restoreTimerState();
      }
    },

    // 更新训练计划名称列表
    updateTrainingPlanNames() {
      console.log(this.data.trainingPlans)
      const trainingPlanNames = this.data.trainingPlans.length === 0 ? '' : this.data.trainingPlans.map(plan => plan.name);
      this.setData({ trainingPlanNames });
    },

    // 选择训练计划
    selectTrainingPlan(e) {
      const selectedPlanIndex = parseInt(e.detail.value);
      const selectedPlan = this.data.trainingPlans[selectedPlanIndex];
      
      // 初始化完成状态数组
      const completedExercises = new Array(selectedPlan.exercises.length).fill(false);
      
      // 设置计时器初始值（分钟转换为秒）
      const timerSeconds = parseInt(selectedPlan.duration) * 60;
      
      this.setData({
        selectedPlanIndex,
        selectedPlan,
        completedExercises,
        timerSeconds,
        timerDisplay: this.formatTime(timerSeconds),
        trainingFeedback: ''
      });
    },

    // 格式化时间（秒转为 HH:MM:SS 格式）
    formatTime(seconds) {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      
      return [
        hours.toString().padStart(2, '0'),
        minutes.toString().padStart(2, '0'),
        secs.toString().padStart(2, '0')
      ].join(':');
    },

    // 切换计时器状态（开始/暂停）
    toggleTimer() {
      if (this.data.isTimerRunning) {
        // 暂停计时器
        clearInterval(this.data.timerInterval);
        this.setData({
          isTimerRunning: false,
          timerInterval: null
        });
        // 保存状态
        this.saveTimerStateWithoutStopping();
      } else {
        // 开始计时器
        const timerInterval = setInterval(() => {
          let timerSeconds = this.data.timerSeconds;
          
          if (timerSeconds <= 0) {
            // 计时结束
            this._endTimer();
            return;
          }
          
          timerSeconds--;
          this.setData({
            timerSeconds,
            timerDisplay: this.formatTime(timerSeconds)
          });
          
          // 每隔一段时间保存状态（例如每30秒）
          if (timerSeconds % 30 === 0) {
            this.saveTimerStateWithoutStopping();
          }
        }, 1000);
        
        this.setData({
          isTimerRunning: true,
          onExecution: true,
          activeTab: 'execute', // 确保切换到执行训练选项卡
          timerInterval
        });
      }
    },

    // 新增辅助方法处理计时结束
    _endTimer() {
      clearInterval(this.data.timerInterval);
      this.setData({
        isTimerRunning: false,
        timerInterval: null,
        onExecution: false,
        activeTab: 'plan' // 计时结束时切换到计划选项卡
      });
      wx.showToast({
        title: '训练时间到！',
        icon: 'success'
      });
      // 清除保存的计时器状态
      wx.removeStorageSync('timerState');
    },

    // 重置计时器
    resetTimer() {
      // 清除现有计时器
      if (this.data.timerInterval) {
        clearInterval(this.data.timerInterval);
      }
      
      // 重置为初始状态
      const timerSeconds = this.data.selectedPlan ? parseInt(this.data.selectedPlan.duration) * 60 : 0;
      this.setData({
        timerSeconds,
        timerDisplay: this.formatTime(timerSeconds),
        isTimerRunning: false,
        onExecution: false,
        activeTab: 'plan', // 重置时切换到计划选项卡
        timerInterval: null
      });
      
      // 清除保存的计时器状态
      wx.removeStorageSync('timerState');
    },

    // 切换训练项目完成状态
    toggleExerciseComplete(e) {
      const index = e.currentTarget.dataset.index;
      const completedExercises = [...this.data.completedExercises];
      completedExercises[index] = !completedExercises[index];
      this.setData({ completedExercises });
    },

    // 保存训练记录
    saveTrainingRecord() {
      const { selectedPlan, completedExercises, trainingFeedback } = this.data;
      
      if (!selectedPlan) {
        wx.showToast({
          title: '请选择训练计划',
          icon: 'none'
        });
        return;
      }
      
      // 计算完成的项目数量
      const completedCount = completedExercises.filter(Boolean).length;
      const totalCount = selectedPlan.exercises.length;
      
      // 创建新记录
      const newRecord = {
        id: Date.now().toString(),
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        date: new Date().toISOString().split('T')[0], // 格式：YYYY-MM-DD
        duration: selectedPlan.duration,
        completedCount,
        totalCount,
        feedback: trainingFeedback.trim(),
        createdAt: new Date().toISOString()
      };
      
      // 获取现有记录并添加新记录
      const trainingRecords = [newRecord, ...this.data.trainingRecords];
      
      // 保存到本地存储
      if (this.saveTrainingRecords(trainingRecords)) {
        // 更新状态并重置表单
        this.setData({
          trainingRecords,
          filteredRecords: trainingRecords,
          selectedPlanIndex: -1,
          selectedPlan: null,
          completedExercises: [],
          trainingFeedback: '',
          timerDisplay: '00:00:00',
          timerSeconds: 0,
          isTimerRunning: false,
          onExecution: false,
          activeTab: 'plan' // 保存记录后切换到计划选项卡
        });
        
        // 清除计时器
        if (this.data.timerInterval) {
          clearInterval(this.data.timerInterval);
          this.setData({ timerInterval: null });
        }
        
        // 清除保存的计时器状态
        wx.removeStorageSync('timerState');
        
        wx.showToast({
          title: '训练记录已保存',
          icon: 'success'
        });
      }
    },

    // 更改过滤日期
    changeFilterDate(e) {
      this.setData({
        filterDate: e.detail.value
      });
    },

    // 搜索记录
    searchRecords() {
      const { trainingRecords, filterDate } = this.data;
      
      if (!filterDate) {
        // 如果没有设置过滤日期，显示所有记录
        this.setData({
          filteredRecords: trainingRecords
        });
        return;
      }
      
      // 根据日期过滤记录
      const filteredRecords = trainingRecords.filter(record => record.date === filterDate);
      this.setData({ filteredRecords });
    },

    // 保存训练记录到本地存储
    saveTrainingRecords(records) {
      try {
        wx.setStorageSync('trainingRecords', records || []);
        return true;
      } catch (e) {
        console.error('保存训练记录失败', e);
        wx.showToast({
          title: '保存失败，请重试',
          icon: 'none'
        });
        return false;
      }
    },

    // 从本地存储加载训练记录
    loadTrainingRecords() {
      try {
        const trainingRecords = wx.getStorageSync('trainingRecords') || [];
        this.setData({
          trainingRecords,
          filteredRecords: trainingRecords
        });
        return trainingRecords;
      } catch (e) {
        console.error('加载训练记录失败', e);
        wx.showToast({
          title: '加载失败，请重试',
          icon: 'none'
        });
        this.setData({
          trainingRecords: [],
          filteredRecords: []
        });
        return [];
      }
    },

    // 添加训练项目
    addExercise() {
      const { exerciseInput, exercises } = this.data;
      if (!exerciseInput.trim()) {
        wx.showToast({
          title: '请输入训练项目',
          icon: 'none'
        });
        return;
      }

      this.setData({
        exercises: [...exercises, exerciseInput.trim()],
        exerciseInput: ''
      });
    },

    // 删除训练项目
    deleteExercise(e) {
      const index = e.currentTarget.dataset.index;
      const exercises = [...this.data.exercises];
      exercises.splice(index, 1);
      this.setData({ exercises });
    },

    // 复制训练项目
    copyExercises() {
      const exercisesText = this.data.exercises.join('\n');
      wx.setClipboardData({
        data: exercisesText,
        success: () => {
          wx.showToast({
            title: '已复制到剪贴板',
            icon: 'success'
          });
        }
      });
    },

    // 创建训练计划
    createPlan() {
      const { planName, planDuration, exercises } = this.data;
      
      // 验证输入
      if (!planName.trim()) {
        wx.showToast({
          title: '请输入计划名称',
          icon: 'none'
        });
        return;
      }

      if (!planDuration || isNaN(planDuration) || parseInt(planDuration) <= 0) {
        wx.showToast({
          title: '请输入有效的训练时长',
          icon: 'none'
        });
        return;
      }

      if (exercises.length === 0) {
        wx.showToast({
          title: '请添加至少一个训练项目',
          icon: 'none'
        });
        return;
      }

      // 创建新计划
      const newPlan = {
        id: Date.now().toString(),
        name: planName.trim(),
        duration: parseInt(planDuration),
        exercises: [...exercises],
        createdAt: new Date().toISOString()
      };

      // 获取现有计划并添加新计划
      const trainingPlans = [...this.data.trainingPlans, newPlan];
      
      // 保存到本地存储
      if (this.saveTrainingPlans(trainingPlans)) {
        // 更新状态并重置表单
        this.setData({
          trainingPlans,
          planName: '',
          planDuration: '',
          exerciseInput: '',
          exercises: []
        });

        // 更新训练计划名称列表
        this.updateTrainingPlanNames();

        wx.showToast({
          title: '计划创建成功',
          icon: 'success'
        });
      }
    },

    // 查看计划详情
    viewPlanDetail(e) {
      const planId = e.currentTarget.dataset.id;
      const plan = this.data.trainingPlans.find(p => p.id === planId);
      
      if (plan) {
        this.setData({
          showPlanDetail: true,
          currentPlan: plan
        });
      }
    },

    // 关闭计划详情
    closePlanDetail() {
      this.setData({
        showPlanDetail: false,
        currentPlan: null
      });
    },

    // 删除计划
    deletePlan(e) {
      const planId = e.currentTarget.dataset.id;
      
      wx.showModal({
        title: '确认删除',
        content: '确定要删除这个训练计划吗？',
        success: (res) => {
          if (res.confirm) {
            const trainingPlans = this.data.trainingPlans.filter(p => p.id !== planId);
            this.saveTrainingPlans(trainingPlans);
            this.setData({ trainingPlans });
            
            // 更新训练计划名称列表
            this.updateTrainingPlanNames();
            
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            });
          }
        }
      });
    },

    // 执行训练计划
    executePlan(e) {
      const planId = e.currentTarget.dataset.id;
      const planIndex = this.data.trainingPlans.findIndex(p => p.id === planId);
      
      if (planIndex >= 0) {
        this.setData({
          activeTab: 'execute'
        });
        
        // 延迟一下再设置选中的计划，确保选项卡已经切换
        setTimeout(() => {
          this.selectTrainingPlan({
            detail: { value: planIndex }
          });
        }, 100);
      }
    },

    // 保存训练计划到本地存储
    saveTrainingPlans(plans) {
      try {
        wx.setStorageSync('trainingPlans', plans || []);
        return true;
      } catch (e) {
        console.error('保存训练计划失败', e);
        wx.showToast({
          title: '保存失败，请重试',
          icon: 'none'
        });
        return false;
      }
    },

    // 从本地存储加载训练计划
    loadTrainingPlans() {
      try {
        const plans = wx.getStorageSync('trainingPlans') || [];
        const planNames = plans.map(item => item.name);
        this.setData({
          trainingPlans: plans,
          trainingPlanNames: planNames
        });
        return plans;
      } catch (e) {
        console.error('加载训练计划失败', e);
        wx.showToast({
          title: '加载失败，请重试',
          icon: 'none'
        });
        this.setData({
          trainingPlans: [],
          trainingPlanNames: []
        });
        return [];
      }
    },

    // 编辑训练项目
    editExercise(e) {
      const index = e.currentTarget.dataset.index;
      const exerciseContent = this.data.exercises[index];
      
      this.setData({
        showEditExercise: true,
        editExerciseIndex: index,
        editExerciseContent: exerciseContent
      });
    },
    
    // 关闭编辑弹窗
    closeEditExercise() {
      this.setData({
        showEditExercise: false,
        editExerciseIndex: -1,
        editExerciseContent: ''
      });
    },
    
    // 保存编辑后的训练项目
    saveEditExercise() {
      const { editExerciseIndex, editExerciseContent, exercises } = this.data;
      
      if (editExerciseIndex >= 0 && editExerciseContent.trim()) {
        const updatedExercises = [...exercises];
        updatedExercises[editExerciseIndex] = editExerciseContent.trim();
        
        this.setData({
          exercises: updatedExercises,
          showEditExercise: false,
          editExerciseIndex: -1,
          editExerciseContent: ''
        });
        
        wx.showToast({
          title: '修改成功',
          icon: 'success'
        });
      } else {
        wx.showToast({
          title: '内容不能为空',
          icon: 'none'
        });
      }
    },

    // 保存计时器状态但不停止计时
    saveTimerStateWithoutStopping() {
      // 保存当前计时器状态到本地存储
      if (!this.data.selectedPlan) return;
      
      const timerState = {
        isRunning: this.data.isTimerRunning,
        seconds: this.data.timerSeconds,
        selectedPlanIndex: this.data.selectedPlanIndex,
        completedExercises: this.data.completedExercises,
        trainingFeedback: this.data.trainingFeedback,
        onExecution: this.data.onExecution,
        lastTimestamp: Date.now()
      };
      
      try {
        wx.setStorageSync('timerState', timerState);
      } catch (e) {
        console.error('保存计时器状态失败', e);
      }
    },

    // 恢复计时器状态
    restoreTimerState() {
      try {
        const timerState = wx.getStorageSync('timerState');
        
        if (!timerState || !this.data.trainingPlans || this.data.trainingPlans.length === 0) {
          return;
        }
        
        // 计算经过的时间（如果计时器在运行）
        let secondsElapsed = 0;
        if (timerState.isRunning && timerState.lastTimestamp) {
          secondsElapsed = Math.floor((Date.now() - timerState.lastTimestamp) / 1000);
        }
        
        // 确保selectedPlanIndex在有效范围内
        const selectedPlanIndex = Math.min(timerState.selectedPlanIndex, this.data.trainingPlans.length - 1);
        if (selectedPlanIndex < 0) return;
        
        const selectedPlan = this.data.trainingPlans[selectedPlanIndex];
        
        // 更新计时器秒数
        const timerSeconds = Math.max(0, timerState.seconds - secondsElapsed);
        
        // 恢复状态
        const onExecution = timerState.onExecution || false;
        
        this.setData({
          selectedPlanIndex,
          selectedPlan,
          completedExercises: timerState.completedExercises || [],
          trainingFeedback: timerState.trainingFeedback || '',
          timerSeconds,
          timerDisplay: this.formatTime(timerSeconds),
          onExecution
        });
        
        // 如果计时器应该在运行且还有剩余时间，重新启动它
        if (timerState.isRunning && timerSeconds > 0) {
          this._restartTimer(timerSeconds);
        } else if (timerSeconds <= 0) {
          // 如果时间已经结束，清除状态
          wx.removeStorageSync('timerState');
        }
      } catch (e) {
        console.error('恢复计时器状态失败', e);
      }
    },

    // 新增辅助方法重启计时器
    _restartTimer(seconds) {
      // 清除现有计时器（如果有）
      if (this.data.timerInterval) {
        clearInterval(this.data.timerInterval);
      }
      
      // 启动新计时器
      const timerInterval = setInterval(() => {
        let seconds = this.data.timerSeconds;
        
        if (seconds <= 0) {
          this._endTimer();
          return;
        }
        
        seconds--;
        this.setData({
          timerSeconds: seconds,
          timerDisplay: this.formatTime(seconds)
        });
        
        // 每隔一段时间保存状态
        if (seconds % 30 === 0) {
          this.saveTimerStateWithoutStopping();
        }
      }, 1000);
      
      this.setData({
        isTimerRunning: true,
        timerInterval
      });
    },

    // 保存计时器状态
    saveTimerState() {
      // 如果计时器正在运行，先停止它
      if (this.data.timerInterval) {
        clearInterval(this.data.timerInterval);
        this.setData({ timerInterval: null });
      }
      
      // 保存当前计时器状态到本地存储
      this.saveTimerStateWithoutStopping();
    }
  }
}) 