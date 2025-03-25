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
    title: '',
    typeArray: ['成绩', '心得技巧'],
    typeIndex: 0,
    date: '',
    location: '',
    experience: '',
    showFireworks: false,
    fireworksCount: 20,
    showCard: false,
    breakthroughList: []
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached() {
      this.loadBreakthroughs();
    },
    ready() {
      // 再次加载，确保数据显示
      this.loadBreakthroughs();
    }
  },

  /**
   * 页面生命周期
   */
  pageLifetimes: {
    show() {
      // 页面显示时也加载数据
      this.loadBreakthroughs();
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    bindTypeChange(e) {
      this.setData({
        typeIndex: e.detail.value
      });
    },
    
    bindDateChange(e) {
      this.setData({
        date: e.detail.value
      });
    },
    
    loadBreakthroughs() {
      const breakthroughs = wx.getStorageSync('breakthroughs') || [];
      console.log('获取到的记录:', JSON.stringify(breakthroughs));
      
      this.setData({
        breakthroughList: breakthroughs
      });
      
      // 确保数据已经设置
      setTimeout(() => {
        const currentList = this.data.breakthroughList;
      }, 100);
    },
    
    submitBreakthrough() {
      // 修改验证逻辑，只检查标题和日期
      if (!this.data.title || !this.data.date) {
        wx.showToast({
          title: '请填写标题和日期',
          icon: 'none'
        });
        return;
      }
      
      // 显示烟花动画
      this.showFireworksAnimation();
      
      // 保存数据到本地存储
      const breakthrough = {
        id: Date.now().toString(), // 使用时间戳作为唯一ID
        title: this.data.title,
        type: this.data.typeArray[this.data.typeIndex],
        date: this.data.date,
        location: this.data.location || '', // 允许为空
        experience: this.data.experience || '' // 允许为空
      };
      
      // 获取已有的突破记录
      const breakthroughs = wx.getStorageSync('breakthroughs') || [];
      breakthroughs.unshift(breakthrough);
      wx.setStorageSync('breakthroughs', breakthroughs);
      
      // 更新突破记录列表
      this.setData({
        breakthroughList: breakthroughs,
        // 清空表单
        title: '',
        date: '',
        location: '',
        experience: '',
        typeIndex: 0,
        showCard: true
      });
      
      // 3秒后隐藏卡片
      setTimeout(() => {
        this.setData({
          showCard: false
        });
      }, 3000);
    },
    
    // 查看卡片详情
    viewCardDetail(e) {
      const { id } = e.currentTarget.dataset;
      const card = this.data.breakthroughList.find(item => item.id === id);
      
      if (card) {
        wx.showModal({
          title: card.title,
          content: `类型: ${card.type}\n日期: ${card.date}\n地点: ${card.location}\n\n${card.experience || '无心得体会'}`,
          showCancel: false,
          confirmText: '关闭'
        });
      }
    },
    
    // 删除卡片
    deleteCard(e) {
      const { id } = e.currentTarget.dataset;
      
      wx.showModal({
        title: '确认删除',
        content: '确定要删除这条突破记录吗？',
        success: (res) => {
          if (res.confirm) {
            // 从列表中移除
            const updatedList = this.data.breakthroughList.filter(item => item.id !== id);
            
            // 更新存储和视图
            wx.setStorageSync('breakthroughs', updatedList);
            this.setData({
              breakthroughList: updatedList
            });
            
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            });
          }
        }
      });
    },
    
    showFireworksAnimation() {
      // 创建随机颜色的烟花
      const fireworkElements = [];
      const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
      
      for (let i = 0; i < this.data.fireworksCount; i++) {
        const color = colors[Math.floor(Math.random() * colors.length)];
        const left = Math.random() * 100;
        const animationDuration = (Math.random() * 0.5 + 0.5);
        const animationDelay = (Math.random() * 0.5);
        
        fireworkElements.push({
          color,
          left,
          animationDuration,
          animationDelay
        });
      }
      
      this.setData({
        fireworkElements,
        showFireworks: true
      });
      
      // 3秒后隐藏烟花
      setTimeout(() => {
        this.setData({
          showFireworks: false
        });
      }, 3000);
    }
  }
}) 