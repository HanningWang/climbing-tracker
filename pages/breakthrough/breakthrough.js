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
    breakthroughList: [],
    currentCard: null,
    showDetailCard: false,
    filteredBreakthroughList: [],
    filterDate: ''
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
    
    bindFilterDateChange(e) {
      const filterDate = e.detail.value;
      
      this.setData({ filterDate });
      
      if (filterDate) {
        // 按日期筛选
        const filteredBreakthroughList = this.data.breakthroughList.filter(record => 
          record.date === filterDate
        );
        
        this.setData({ filteredBreakthroughList });
      } else {
        // 显示所有记录
        this.setData({
          filteredBreakthroughList: this.data.breakthroughList
        });
      }
    },
    
    clearDateFilter() {
      this.setData({
        filterDate: '',
        filteredBreakthroughList: this.data.breakthroughList
      });
    },
    
    loadBreakthroughs() {
      const breakthroughs = wx.getStorageSync('breakthroughs') || [];
      console.log('获取到的记录:', JSON.stringify(breakthroughs));
      
      this.setData({
        breakthroughList: breakthroughs,
        filteredBreakthroughList: breakthroughs
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
        filteredBreakthroughList: this.data.filterDate ? 
          breakthroughs.filter(item => item.date === this.data.filterDate) : 
          breakthroughs,
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
        this.setData({
          currentCard: card,
          showDetailCard: true
        });
      }
    },


    // 关闭详情卡片
    closeDetailCard() {
      this.setData({
        showDetailCard: false
      });
    },
    
    // 保存分享卡片到相册
    saveCardToAlbum() {
      wx.showLoading({
        title: '正在保存...',
      });
      
      // 获取卡片节点信息
      const query = wx.createSelectorQuery().in(this);
      query.select('#cardCanvas').fields({
        node: true,
        size: true,
      }).exec((res) => {
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        
        // 设置画布尺寸
        const dpr = wx.getSystemInfoSync().pixelRatio;
        canvas.width = res[0].width * dpr;
        canvas.height = res[0].height * dpr;
        ctx.scale(dpr, dpr);
        
        // 绘制卡片背景
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 绘制卡片内容
        const card = this.data.currentCard;
        
        // 绘制标题
        ctx.fillStyle = '#333333';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('突破记录详情', canvas.width / (2 * dpr), 30);
        
        // 绘制内容
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`${card.title}`, 20, 70);
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`日期：${card.date}`, 20, 100);
        ctx.fillText(`类型：${card.type}`, 20, 130);
        
        if (card.location) {
          ctx.fillText(`地点：${card.location}`, 20, 160);
        }
        
        // 将画布内容保存为图片
        wx.canvasToTempFilePath({
          canvas: canvas,
          success: (res) => {
            wx.saveImageToPhotosAlbum({
              filePath: res.tempFilePath,
              success: () => {
                wx.hideLoading();
                wx.showToast({
                  title: '保存成功',
                  icon: 'success'
                });
              },
              fail: (err) => {
                wx.hideLoading();
                wx.showToast({
                  title: '保存失败',
                  icon: 'none'
                });
                console.error('保存失败:', err);
              }
            });
          },
          fail: (err) => {
            wx.hideLoading();
            wx.showToast({
              title: '生成图片失败',
              icon: 'none'
            });
            console.error('生成图片失败:', err);
          }
        });
      });
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
              breakthroughList: updatedList,
              filteredBreakthroughList: this.data.filterDate ? 
                updatedList.filter(item => item.date === this.data.filterDate) : 
                updatedList
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
      // 创建更真实的烟花效果
      const fireworkElements = [];
      const sparkleElements = [];
      const colors = ['#ff0000', '#ffff00', '#00ffff', '#ff9900', '#ff5500', '#ff00ff', 
                     '#ffcc00', '#88ff00', '#00ffaa', '#ff88cc'];
      
      // 发射点数量
      const launchPoints = 8;
      
      // 为每个发射点创建烟花
      for (let i = 0; i < launchPoints; i++) {
        const baseLeft = 10 + (i * 80 / launchPoints); // 均匀分布发射点
        const baseColor = colors[Math.floor(Math.random() * colors.length)];
        
        // 每个发射点发射多个粒子
        const particleCount = Math.floor(Math.random() * 10) + 15; // 15-25个粒子
        
        for (let j = 0; j < particleCount; j++) {
          // 随机角度，形成圆形爆炸效果
          const angle = Math.random() * Math.PI * 2;
          const distance = Math.random() * 15 + 5; // 爆炸半径
          
          // 计算粒子最终位置
          const left = baseLeft + Math.cos(angle) * distance;
          const top = 40 + Math.sin(angle) * distance;
          
          // 随机大小和动画时间 - 缩短动画时间
          const size = Math.random() * 4 + 2; // 2-6px
          const animationDuration = Math.random() * 0.5 + 0.5; // 0.5-1秒，缩短了动画时间
          const animationDelay = Math.random() * 0.2; // 0-0.2秒延迟，减少了延迟时间
          
          fireworkElements.push({
            color: baseColor,
            left,
            top,
            size,
            animationDuration,
            animationDelay,
            opacity: Math.random() * 0.3 + 0.7, // 0.7-1的透明度
            type: 0 // 使用圆形
          });
        }
        
      }
      
      // 添加额外的闪光点 - 减少数量和持续时间
      for (let i = 0; i < 15; i++) { // 减少闪光点数量
        sparkleElements.push({
          left: Math.random() * 100,
          top: Math.random() * 70 + 10,
          size: Math.random() * 3 + 1,
          delay: Math.random() * 0.8, // 减少延迟
          duration: Math.random() * 0.6 + 0.3, // 缩短持续时间
          color: colors[Math.floor(Math.random() * colors.length)]
        });
      }
      
      this.setData({
        fireworkElements,
        sparkleElements,
        showFireworks: true
      });
      
      // 2.5秒后隐藏烟花
      setTimeout(() => {
        this.setData({
          showFireworks: false
        });
      }, 2000); // 从5000ms改为2500ms
    },
    
    // 阻止事件冒泡
    stopPropagation(e) {
      // 阻止事件冒泡，防止点击卡片内容时关闭卡片
      return;
    },
  }
}) 