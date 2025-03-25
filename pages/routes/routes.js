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
    activeTab: 'normal',
    typeArray: ['抱石', '先锋', '速度'],
    typeIndex: 0,
    difficultyArray: ['V0', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'V9', 'V10', 'V11', 'V12', 'V13', 'V14', 'V15', 'V16'],
    difficultyIndex: 0,
    quantity: '',
    location: '',
    date: '',
    trainingTime: '',
    routesList: [],
    historyRecords: [],
    filteredRecords: [],
    filterDate: ''
  },

  lifetimes: {
    attached: function() {
      this.loadHistoryRecords();
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    switchTab(e) {
      const tab = e.currentTarget.dataset.tab;
      this.setData({
        activeTab: tab
      });
    },

    bindTypeChange(e) {
      const typeIndex = e.detail.value;
      let difficultyArray = [];
      
      // 根据攀岩类型设置对应的难度数组
      if (this.data.typeArray[typeIndex] === '抱石') {
        difficultyArray = ['V0', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'V9', 'V10', 'V11', 'V12', 'V13', 'V14', 'V15', 'V16'];
      } else if (this.data.typeArray[typeIndex] === '先锋') {
        difficultyArray = ['5.5', '5.6', '5.7', '5.8', '5.9', '5.10a', '5.10b', '5.10c', '5.10d', '5.11a', '5.11b', '5.11c', '5.11d', '5.12a', '5.12b', '5.12c', '5.12d', '5.13a', '5.13b', '5.13c', '5.13d', '5.14a', '5.14b', '5.14c', '5.14d', '5.15a', '5.15b', '5.15c', '5.15d'];
      } else if (this.data.typeArray[typeIndex] === '速度') {
        const times = [];
        for (let i = 1; i <= 20; i++) {
          times.push(`${i}次`);
        }
        difficultyArray = times;
      }
      
      this.setData({
        typeIndex,
        difficultyArray,
        difficultyIndex: 0
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
      const { typeArray, typeIndex, difficultyArray, difficultyIndex, quantity } = this.data;
      
      if (!quantity || quantity <= 0) {
        wx.showToast({
          title: '请输入有效数量',
          icon: 'none'
        });
        return;
      }
      
      const newRoute = {
        type: typeArray[typeIndex],
        difficulty: difficultyArray[difficultyIndex],
        quantity: parseInt(quantity)
      };
      
      const routesList = [...this.data.routesList, newRoute];
      
      this.setData({
        routesList,
        quantity: ''
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
      const { routesList, location, date, trainingTime } = this.data;
      
      if (routesList.length === 0) {
        wx.showToast({
          title: '请添加至少一条路线',
          icon: 'none'
        });
        return;
      }
      
      if (!date) {
        wx.showToast({
          title: '请选择日期',
          icon: 'none'
        });
        return;
      }
      
      if (!trainingTime || trainingTime <= 0) {
        wx.showToast({
          title: '请输入有效训练时间',
          icon: 'none'
        });
        return;
      }
      
      // 创建新记录
      const newRecord = {
        id: Date.now().toString(),
        date,
        location: location || '未知地点',
        trainingTime: parseInt(trainingTime),
        routes: [...routesList]
      };
      
      // 获取现有记录
      const historyRecords = wx.getStorageSync('climbingRoutes') || [];
      console.log("刷线记录 " + historyRecords);
      
      // 添加新记录
      const updatedRecords = [newRecord, ...historyRecords];
      
      // 保存到本地存储
      wx.setStorageSync('climbingRoutes', updatedRecords);
      
      // 更新状态
      this.setData({
        historyRecords: updatedRecords,
        filteredRecords: updatedRecords
      });
      
      // 清空表单
      this.clearForm();
      
      wx.showToast({
        title: '记录已保存',
        icon: 'success'
      });
    },

    clearForm() {
      this.setData({
        typeIndex: 0,
        difficultyIndex: 0,
        quantity: '',
        location: '',
        date: '',
        trainingTime: '',
        routesList: []
      });
      
      // 重新设置难度数组
      this.bindTypeChange({ detail: { value: 0 } });
    },

    loadHistoryRecords() {
      const historyRecords = wx.getStorageSync('climbingRoutes') || [];
      console.log("刷线记录 " + JSON.stringify(historyRecords));
      
      this.setData({
        historyRecords,
        filteredRecords: historyRecords
      });
    },

    bindFilterDateChange(e) {
      const filterDate = e.detail.value;
      
      this.setData({ filterDate });
      
      if (filterDate) {
        // 按日期筛选
        const filteredRecords = this.data.historyRecords.filter(record => 
          record.date === filterDate
        );
        
        this.setData({ filteredRecords });
      } else {
        // 显示所有记录
        this.setData({
          filteredRecords: this.data.historyRecords
        });
      }
    },

    deleteRecord(e) {
      const id = e.currentTarget.dataset.id;
      
      wx.showModal({
        title: '确认删除',
        content: '确定要删除这条记录吗？',
        success: (res) => {
          if (res.confirm) {
            // 过滤掉要删除的记录
            const historyRecords = this.data.historyRecords.filter(record => 
              record.id !== id
            );
            
            // 更新本地存储
            wx.setStorageSync('climbingRoutes', historyRecords);
            
            // 更新状态
            this.setData({
              historyRecords,
              filteredRecords: this.data.filterDate 
                ? historyRecords.filter(record => record.date === this.data.filterDate)
                : historyRecords
            });
            
            wx.showToast({
              title: '记录已删除',
              icon: 'success'
            });
          }
        }
      });
    },

    viewRecordDetail(e) {
      const id = e.currentTarget.dataset.id;
      const record = this.data.historyRecords.find(record => record.id === id);
      
      if (record) {
        // 可以使用弹窗显示详情
        wx.showModal({
          title: '刷线详情',
          content: this.formatRecordDetail(record),
          showCancel: false,
          confirmText: '关闭'
        });
        
        // 或者也可以跳转到详情页面
        // wx.navigateTo({
        //   url: `/pages/route-detail/route-detail?id=${id}`
        // });
      }
    },

    formatRecordDetail(record) {
      let detail = `日期: ${record.date}\n地点: ${record.location}\n训练时间: ${record.trainingTime}分钟\n\n路线详情:\n`;
      
      record.routes.forEach((route, index) => {
        detail += `${index + 1}. ${route.type} ${route.difficulty} x${route.quantity}\n`;
      });
      
      return detail;
    }
  }
}) 