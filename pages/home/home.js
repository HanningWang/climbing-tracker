// pages/home/home.js
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
    statsData: {
      trainingDays: 0,
      breakthroughCount: 0,
      boulderingCount: 0,
      leadClimbingCount: 0,
      climbingTime: {
        hours: 0,
        minutes: 0
      },
      trainingTime: {
        hours: 0,
        minutes: 0
      }
    },
    timeFilter: 'week', // 'week' or 'all'
    climbingProgress: {
      startDate: '',
      endDate: '',
      records: [],
      maxClimbCount: 8,
      maxClimbTime: 100
    },
    showAchievementCard: false,
    achievementDate: '',
    nickname: '匿名用户',
  },

  /**
   * 组件的方法列表
   */
  methods: {
    changeTimeFilter(e) {
      const filter = e.currentTarget.dataset.filter;
      this.setData({
        timeFilter: filter
      });
      this.fetchStatsData(filter);
    },

    fetchStatsData(timeFilter) {
      try {
        // 从本地存储获取数据
        const breakthroughs = wx.getStorageSync('breakthroughs') || [];
        const climbingRoutes = wx.getStorageSync('climbingRoutes') || [];
        const trainingRecords = wx.getStorageSync('trainingRecords') || [];
        const climbingGameRecords =wx.getStorageSync('climbingGameRecords') || [];
        
        // 添加日志输出
        console.log('breakthroughs:', breakthroughs);
        console.log('climbingRoutes:', climbingRoutes);
        console.log('trainingRecords:', trainingRecords);
        console.log('climbingGameRoutes: ', climbingGameRecords);
        
        // 根据时间筛选数据
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        // 筛选数据
        const filteredBreakthroughs = timeFilter === 'week' 
          ? breakthroughs.filter(item => item && item.date && new Date(item.date) >= oneWeekAgo) : breakthroughs;
          
        const filteredClimbingRoutes = timeFilter === 'week'
          ? climbingRoutes.filter(item => item && item.date && new Date(item.date) >= oneWeekAgo) : climbingRoutes;

        const filteredGameRoutes =  timeFilter === 'week'
          ? climbingGameRecords.filter(item => item && item.date && Date(item.date) >= oneWeekAgo) : climbingGameRecords;
          
        const filteredTrainingRecords = timeFilter === 'week'
          ? trainingRecords.filter(item => item && item.date && new Date(item.date) >= oneWeekAgo) : trainingRecords;
        
        // 计算统计数据
        // 1. 训练天数 - 所有记录的不重复日期数量
        const trainingDaysSet = new Set();
        const totalTrainings = filteredClimbingRoutes.concat(filteredTrainingRecords);
        
        totalTrainings.forEach(record => {
          if (record && record.date) {
            const dateStr = String(record.date).split(' ')[0];
            trainingDaysSet.add(dateStr);
          }
        });
        
        const trainingDays = trainingDaysSet.size;
        
        // 2. 突破次数
        const breakthroughCount = filteredBreakthroughs.length;
        
        // 3. 抱石攀爬数量
        const boulderingCount = filteredClimbingRoutes.reduce((sum, record) => {
          if (!record || !record.routes) return sum;
          // Sum up quantities for all bouldering routes in this record
          const recordBoulderingCount = record.routes
            .filter(route => route && route.type === '抱石')
            .reduce((routeSum, route) => routeSum + route.quantity, 0);
          return sum + Number(recordBoulderingCount);
        }, 0);
        
        // 4. 先锋攀爬次数
        const leadClimbingCount = filteredClimbingRoutes.reduce((sum, record) => {
          if (!record || !record.routes) return sum;
          // Sum up quantities for all lead climbing routes in this record
          const recordLeadCount = record.routes
            .filter(route => route && route.type === '先锋')
            .reduce((routeSum, route) => routeSum + route.quantity, 0);
          return sum + Number(recordLeadCount);
        }, 0);
        
        // 5. 攀登刷线时间
        const totalClimbingMinutes = filteredClimbingRoutes.reduce((sum, route) => {
          return sum + Number(route.trainingTime);
        }, 0);

        const totalGameMinutes = filteredGameRoutes.reduce((sum, route) => {
          return sum + Number(route.gameElapsedTime);
        }, 0);

        const totalRoutesTime = totalClimbingMinutes + totalGameMinutes;
        
        const climbingTime = {
          hours: Math.floor(totalRoutesTime / 60),
          minutes: totalRoutesTime % 60
        };
        
        // 6. 训练时间
        const totalTrainingMinutes = filteredTrainingRecords.reduce((sum, record) => {
          return sum + Number(record.duration);
        }, 0);
        
        const trainingTime = {
          hours: Math.floor(totalTrainingMinutes / 60),
          minutes: totalTrainingMinutes % 60
        };
        
        // 输出计算结果
        console.log('计算结果:', {
          trainingDays,
          breakthroughCount,
          boulderingCount,
          leadClimbingCount,
          climbingTime,
          trainingTime
        });
        
        // 更新数据
        this.setData({
          statsData: {
            trainingDays,
            breakthroughCount,
            boulderingCount,
            leadClimbingCount,
            climbingTime,
            trainingTime
          }
        });
        
        // 计算攀爬进度数据
        this.calculateClimbingProgress(filteredClimbingRoutes);
        
      } catch (error) {
        console.error('获取统计数据出错:', error);
        // 出错时至少显示默认数据
        this.setData({
          statsData: {
            trainingDays: 0,
            breakthroughCount: 0,
            boulderingCount: 0,
            leadClimbingCount: 0,
            climbingTime: { hours: 0, minutes: 0 },
            trainingTime: { hours: 0, minutes: 0 }
          }
        });
      }
    },

    calculateClimbingProgress(filteredClimbingRoutes) {
      // 获取当前日期作为结束日期
      const now = new Date();
      const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      // 开始日期固定为7天前
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 6); // 7天包括今天
      
      // 创建日期范围内的所有日期记录
      const records = [];
      
      // 生成日期范围内的每一天
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
        
        // 找出这一天的所有记录 - 使用日期字符串比较而不是ISO字符串
        const currentDate = new Date(d);
        const dayRecords = filteredClimbingRoutes.filter(record => {
          if (!record || !record.date) return false;
          
          const recordDate = new Date(record.date);
          
          // 使用年月日比较，忽略时间部分
          return recordDate.getFullYear() === currentDate.getFullYear() && 
                 recordDate.getMonth() === currentDate.getMonth() && 
                 recordDate.getDate() === currentDate.getDate();
        });
        
        // 计算这一天的攀爬数量
        const climbingCount = dayRecords.reduce((sum, record) => {
          if (!record || !record.routes) return sum;
          return sum + record.routes.reduce((routeSum, route) => routeSum + route.quantity, 0);
        }, 0);
        
        // 计算这一天的攀爬时间
        const climbingMinutes = dayRecords.reduce((sum, record) => {
          return sum + (Number(record.trainingTime) || 0);
        }, 0);
        
        records.push({
          date: dateStr,
          climbingCount,
          climbingMinutes
        });
      }
      
      // 计算最大值
      const maxClimbCount = Math.max(
        ...records.map(r => r.climbingCount),
        8 // 确保最小值为8
      );
      
      const maxClimbTime = Math.max(
        ...records.map(r => r.climbingMinutes),
        100 // 确保最小值为100
      );
      
      // 格式化日期
      const formatDate = (date) => {
        return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
      };
      
      this.setData({
        climbingProgress: {
          startDate: formatDate(startDate),
          endDate: formatDate(endDate),
          records,
          maxClimbCount,
          maxClimbTime
        }
      });
      
      // 添加日志输出
      console.log('计算后的climbingProgress:', this.data.climbingProgress);
    },

    calculateTotalClimbCount(records) {
      return records.reduce((sum, record) => {
        if (!record || !record.routes) return sum;
        return sum + record.routes.reduce((routeSum, route) => routeSum + route.quantity, 0);
      }, 0);
    },

    // 显示成就卡片
    showAchievementCard() {
      // 格式化当前日期为 YYYY年MM月DD日
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const day = now.getDate();
      const formattedDate = `${year}年${month}月${day}日`;
      
      this.setData({
        showAchievementCard: true,
        achievementDate: formattedDate
      });
    },
    
    // 隐藏成就卡片
    hideAchievementCard() {
      this.setData({
        showAchievementCard: false
      });
    },
    
    // 保存成就卡片
    saveAchievementCard() {
      // 创建 canvas 上下文
      const query = wx.createSelectorQuery().in(this);
      query.select('#achievementCanvas')
        .fields({ node: true, size: true })
        .exec((res) => {
          const canvas = res[0].node;
          const ctx = canvas.getContext('2d');
          
          // 设置 canvas 尺寸
          const dpr = wx.getSystemInfoSync().pixelRatio;
          canvas.width = res[0].width * dpr;
          canvas.height = res[0].height * dpr;
          ctx.scale(dpr, dpr);
          
          // 绘制卡片背景
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);
          
          // 绘制渐变背景
          const gradient = ctx.createLinearGradient(0, 0, canvas.width / dpr, canvas.height / dpr);
          gradient.addColorStop(0, '#3b82f6');
          gradient.addColorStop(1, '#a855f7');
          ctx.fillStyle = gradient;
          ctx.fillRect(20, 60, canvas.width / dpr - 40, canvas.height / dpr - 80);
          
          // 绘制标题
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 18px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('你的攀岩成就', canvas.width / dpr / 2, 90);
          
          // 绘制日期
          ctx.font = '12px sans-serif';
          ctx.fillText(this.data.achievementDate, canvas.width / dpr / 2, 115);
          
          // 绘制统计数据
          ctx.font = '14px sans-serif';
          ctx.textAlign = 'left';
          
          // 第一行数据
          ctx.fillText('训练天数', 40, 150);
          ctx.font = 'bold 16px sans-serif';
          ctx.fillText(this.data.statsData.trainingDays.toString(), 40, 175);
          
          ctx.font = '14px sans-serif';
          ctx.fillText('突破次数', canvas.width / dpr - 120, 150);
          ctx.font = 'bold 16px sans-serif';
          ctx.fillText(this.data.statsData.breakthroughCount.toString(), canvas.width / dpr - 120, 175);
          
          // 第二行数据
          ctx.font = '14px sans-serif';
          ctx.fillText('抱石攀爬数量', 40, 210);
          ctx.font = 'bold 16px sans-serif';
          ctx.fillText(this.data.statsData.boulderingCount.toString(), 40, 235);
          
          ctx.font = '14px sans-serif';
          ctx.fillText('先锋攀爬次数', canvas.width / dpr - 120, 210);
          ctx.font = 'bold 16px sans-serif';
          ctx.fillText(this.data.statsData.leadClimbingCount.toString(), canvas.width / dpr - 120, 235);
          
          // 第三行数据
          ctx.font = '14px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('攀岩刷线时间', canvas.width / dpr / 2, 270);
          ctx.font = 'bold 16px sans-serif';
          ctx.fillText(`${this.data.statsData.climbingTime.hours}小时${this.data.statsData.climbingTime.minutes}分钟`, canvas.width / dpr / 2, 295);
          
          // 第四行数据
          ctx.font = '14px sans-serif';
          ctx.fillText('训练时间', canvas.width / dpr / 2, 330);
          ctx.font = 'bold 16px sans-serif';
          ctx.fillText(`${this.data.statsData.trainingTime.hours}小时${this.data.statsData.trainingTime.minutes}分钟`, canvas.width / dpr / 2, 355);
          
          // 添加小程序名称或水印
          ctx.font = '12px sans-serif';
          ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.textAlign = 'right';
          ctx.fillText('攀岩突破记', canvas.width / dpr - 30, canvas.height / dpr - 20);
          
          // 将 canvas 转换为图片并保存到相册
          wx.canvasToTempFilePath({
            canvas: canvas,
            success: (res) => {
              // 保存图片到相册
              wx.saveImageToPhotosAlbum({
                filePath: res.tempFilePath,
                success: () => {
                  wx.showToast({
                    title: '成就卡片已保存到相册',
                    icon: 'success',
                    duration: 2000
                  });
                  
                  setTimeout(() => {
                    this.hideAchievementCard();
                  }, 2000);
                },
                fail: (err) => {
                  console.error('保存到相册失败:', err);
                  wx.showToast({
                    title: '保存失败，请授权相册权限',
                    icon: 'none',
                    duration: 2000
                  });
                }
              });
            },
            fail: (err) => {
              console.error('生成图片失败:', err);
              wx.showToast({
                title: '生成图片失败',
                icon: 'none',
                duration: 2000
              });
            }
          });
        });
    },

    // 导出PDF
    exportPDF() {
      wx.showLoading({
        title: '正在生成报告...',
      });
      
      try {
        // 从本地存储获取数据
        const breakthroughs = wx.getStorageSync('breakthroughs') || [];
        const climbingRoutes = wx.getStorageSync('climbingRoutes') || [];
        const trainingRecords = wx.getStorageSync('trainingRecords') || [];
        
        // 生成文本报告
        let reportText = '攀岩记录报告\n\n';
        
        // 添加统计数据
        reportText += '统计数据:\n';
        reportText += `训练天数: ${this.data.statsData.trainingDays}\n`;
        reportText += `突破次数: ${this.data.statsData.breakthroughCount}\n`;
        reportText += `抱石攀爬数量: ${this.data.statsData.boulderingCount}\n`;
        reportText += `先锋攀爬次数: ${this.data.statsData.leadClimbingCount}\n`;
        reportText += `攀岩刷线时间: ${this.data.statsData.climbingTime.hours}小时${this.data.statsData.climbingTime.minutes}分钟\n`;
        reportText += `训练时间: ${this.data.statsData.trainingTime.hours}小时${this.data.statsData.trainingTime.minutes}分钟\n\n`;
        
        // 添加突破记录
        reportText += '突破记录:\n';
        if (breakthroughs.length === 0) {
          reportText += '暂无突破记录\n\n';
        } else {
          breakthroughs.forEach((item, index) => {
            if (item && item.date) {
              reportText += `${index + 1}. 日期: ${item.date}\n`;
              reportText += `   难度: ${item.difficulty}\n`;
              reportText += `   描述: ${item.description || '无'}\n\n`;
            }
          });
        }
        
        // 添加攀爬记录
        reportText += '攀爬记录:\n';
        if (climbingRoutes.length === 0) {
          reportText += '暂无攀爬记录\n\n';
        } else {
          climbingRoutes.forEach((item, index) => {
            if (item && item.date) {
              reportText += `${index + 1}. 日期: ${item.date}\n`;
              reportText += `   地点: ${item.location || '未指定'}\n`;
              reportText += `   训练时间: ${item.trainingTime || 0}分钟\n`;
              
              if (item.routes && item.routes.length > 0) {
                reportText += '   路线:\n';
                item.routes.forEach(route => {
                  reportText += `     - 类型: ${route.type}, 难度: ${route.difficulty}, 数量: ${route.quantity}\n`;
                });
              }
              
              reportText += '\n';
            }
          });
        }
        
        // 添加训练记录
        reportText += '训练记录:\n';
        if (trainingRecords.length === 0) {
          reportText += '暂无训练记录\n\n';
        } else {
          trainingRecords.forEach((item, index) => {
            if (item && item.date) {
              reportText += `${index + 1}. 日期: ${item.date}\n`;
              reportText += `   训练类型: ${item.trainingType || '未指定'}\n`;
              reportText += `   持续时间: ${item.duration || 0}分钟\n`;
              reportText += `   备注: ${item.notes || '无'}\n\n`;
            }
          });
        }
        
        // 将文本保存为文件
        const fs = wx.getFileSystemManager();
        const filePath = `${wx.env.USER_DATA_PATH}/climbing_report.txt`;
        
        fs.writeFile({
          filePath: filePath,
          data: reportText,
          encoding: 'utf8',
          success: () => {
            wx.hideLoading();
            
            // 显示导出选项
            wx.showActionSheet({
              itemList: ['分享成就'],
              success: (res) => {
                if (res.tapIndex === 0) {
                  // 保存到手机
                  this.shareReport(filePath);
                }
              },
              fail: () => {
                wx.showToast({
                  title: '操作取消',
                  icon: 'none'
                });
              }
            });
          },
          fail: (err) => {
            console.error('写入文件失败:', err);
            wx.hideLoading();
            wx.showToast({
              title: '导出失败',
              icon: 'none'
            });
          }
        });
      } catch (error) {
        console.error('导出报告出错:', error);
        wx.hideLoading();
        wx.showToast({
          title: '导出失败',
          icon: 'none'
        });
      }
    },
    
    // 保存报告到设备
    saveReportToDevice(filePath) {
      // 尝试复制到相册或文档目录
      wx.saveFileToDisk({
        filePath: filePath,
        success: () => {
          wx.showToast({
            title: '报告已保存',
            icon: 'success'
          });
        },
        fail: (err) => {
          console.error('保存文件失败:', err);
          // 如果不支持saveFileToDisk，尝试其他方法
          this.fallbackSaveReport(filePath);
        }
      });
    },
    
    // 备用保存方法
    fallbackSaveReport(filePath) {
      // 尝试使用文件管理器打开
      wx.openDocument({
        filePath: filePath,
        fileType: 'txt',
        success: () => {
          wx.showToast({
            title: '请手动保存文件',
            icon: 'none',
            duration: 2000
          });
        },
        fail: (err) => {
          console.error('打开文件失败:', err);
          wx.showToast({
            title: '无法保存文件',
            icon: 'none'
          });
        }
      });
    },
    
    // 分享报告
    shareReport(filePath) {
      wx.shareFileMessage({
        filePath: filePath,
        success: () => {
          wx.showToast({
            title: '分享成功',
            icon: 'success'
          });
        },
        fail: (err) => {
          console.error('分享文件失败:', err);
          
          // 尝试备用分享方法
          wx.showModal({
            title: '分享失败',
            content: '是否尝试其他分享方式？',
            success: (res) => {
              if (res.confirm) {
                this.fallbackShareReport(filePath);
              }
            }
          });
        }
      });
    },
    
    // 备用分享方法
    fallbackShareReport(filePath) {
      // 尝试使用系统分享
      wx.openDocument({
        filePath: filePath,
        fileType: 'txt',
        success: () => {
          wx.showToast({
            title: '请使用系统分享功能',
            icon: 'none',
            duration: 2000
          });
        },
        fail: (err) => {
          console.error('打开文件失败:', err);
          wx.showToast({
            title: '无法分享文件',
            icon: 'none'
          });
        }
      });
    },
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached() {
      // 在组件实例进入页面节点树时执行
      this.fetchStatsData(this.data.timeFilter);
      this.setData({
        nickname: wx.getStorageSync("nickname")
      });
    }
  },
  
  // 添加页面显示时刷新数据
  pageLifetimes: {
    show() {
      this.fetchStatsData(this.data.timeFilter);
    }
  }
})