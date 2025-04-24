const { sortRecordsByDate, saveCardToAlbum, wrapText } = require('../../utils/common.js');

Component({
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

  pageLifetimes: {
    show() {
      // 页面显示时也加载数据
      this.loadBreakthroughs();
    }
  },

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
      
      this.setData({
        breakthroughList: breakthroughs,
        filteredBreakthroughList: breakthroughs
      });
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
      const sortedBreakthroughs = sortRecordsByDate(breakthroughs);
      wx.setStorageSync('breakthroughs', sortedBreakthroughs);
      
      // 更新突破记录列表
      this.setData({
        breakthroughList: sortedBreakthroughs,
        filteredBreakthroughList: this.data.filterDate ? 
        sortedBreakthroughs.filter(item => item.date === this.data.filterDate) : 
        sortedBreakthroughs,
        // 清空表单
        title: '',
        date: '',
        location: '',
        experience: '',
        typeIndex: 0
      });
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

    // Method called by the save button in WXML
    callSaveBreakthroughCard() {
        if (!this.data.currentCard) {
            wx.showToast({ title: '无卡片数据', icon: 'none' });
            return;
        }
        const requiredImages = [
            '/assets/png/calendar.png',
            '/assets/png/file-digit.png', // Use the correct icon name
            '/assets/png/map-pin.png',
            '/assets/png/award.png',
            '/assets/png/mountains-header.png' // Optional header bg
        ];
        saveCardToAlbum(
            '#cardCanvas',
            this,
            this.drawBreakthroughCard,
            this.data.currentCard,
            requiredImages
        );
    },

    // --- Drawing Function for Breakthrough Card (Revised for Style Matching) ---
    drawBreakthroughCard(ctx, canvas, cardData, width, height, loadedImages) {
        // --- Constants ---
        const headerHeight = 240;
        const footerHeight = 80;
        const padding = 30;
        const contentWidth = width - 2 * padding;
        const headerGradStart = '#0369a1';
        const headerGradEnd = '#0c4a6e';
        const bodyBgColor = '#ffffff';
        const footerBgColor = '#0c4a6e';
        const headerTextColor = '#ffffff';
        const headerSubTextColor = '#bae6fd';
        const footerTextColor = '#bae6fd';
        const primaryTextColor = '#1e293b';
        const secondaryTextColor = '#64748b';
        const badgeBgColor = '#f59e0b'; // Amber
        const badgeTextColor = '#78350f'; // Dark Amber text
        const iconSize = 20;
        const labelIconSpacing = 8;
        const valueLabelSpacing = 10; // Space between label and value
        const detailItemSpacing = 35; // Vertical space between items
        const experienceLineHeight = 30; // Line height for experience text

        // Font Styles
        const headerTitleFont = 'bold 48px sans-serif';
        const headerSubtitleFont = '24px sans-serif';
        const detailLabelFont = '22px sans-serif';
        const detailValueFont = 'bold 24px sans-serif'; // Bold value
        const experienceFont = '24px sans-serif'; // Normal weight for experience
        const footerFont = '22px sans-serif';
        const badgeFontSize = 'bold 28px sans-serif';

        // --- Backgrounds ---
        ctx.fillStyle = bodyBgColor;
        ctx.fillRect(0, 0, width, height);
        const gradient = ctx.createLinearGradient(0, 0, 0, headerHeight);
        gradient.addColorStop(0, headerGradStart);
        gradient.addColorStop(1, headerGradEnd);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, headerHeight);
        ctx.fillStyle = footerBgColor;
        ctx.fillRect(0, height - footerHeight, width, footerHeight);

        // --- Optional Header Background Image ---
        const headerImage = loadedImages['/assets/png/mountains-header.png'];
        if (headerImage) {
            ctx.globalAlpha = 0.2;
            ctx.drawImage(headerImage, 0, headerHeight * 0.1, width, headerHeight * 0.9);
            ctx.globalAlpha = 1.0;
        }

        // --- Header Text ---
        ctx.fillStyle = headerSubTextColor;
        ctx.textAlign = 'center';
        ctx.font = headerSubtitleFont;
        ctx.fillText('攀岩突破', width / 2, headerHeight * 0.35);
        ctx.fillStyle = headerTextColor;
        ctx.font = headerTitleFont;
        wrapText(ctx, cardData.title || '突破标题', width / 2, headerHeight * 0.65, width * 0.85, 55);

        // --- Achievement Badge ---
        const badgeHeight = 50;
        const badgeWidth = 200;
        const badgeX = (width - badgeWidth) / 2;
        const badgeY = headerHeight - badgeHeight / 2;
        const badgeRadius = badgeHeight / 2;
        // *** Define drawRoundRect helper ***
        const drawRoundRect = (x, y, w, h, r) => {
            if (w < 2 * r) r = w / 2; if (h < 2 * r) r = h / 2;
            ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r);
            ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r);
            ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
        };
        ctx.fillStyle = badgeBgColor;
        drawRoundRect(badgeX, badgeY, badgeWidth, badgeHeight, badgeRadius);
        ctx.fill();
        ctx.fillStyle = badgeTextColor;
        ctx.font = badgeFontSize;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('突破成就', width / 2, badgeY + badgeHeight / 2);
        ctx.textBaseline = 'alphabetic';

        // --- Details Area ---
        let currentY = headerHeight + badgeHeight / 2 + 40; // Start below badge

        // *** Revised Helper to draw detail item horizontally ***
        const drawDetailItemHorizontal = (iconPath, labelText, valueText) => {
            const icon = loadedImages[iconPath];
            const itemStartY = currentY;
            // Calculate Y position to center icon and text vertically on the line
            const verticalCenterY = itemStartY + detailItemSpacing / 2;
            const iconY = verticalCenterY - iconSize / 2;

            // Draw Icon
            if (icon) {
                ctx.drawImage(icon, padding, iconY, iconSize, iconSize);
            } else {
                ctx.fillStyle = secondaryTextColor; // Fallback shape
                ctx.fillRect(padding, iconY, iconSize, iconSize);
            }

            // Prepare text drawing
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle'; // Align text vertically to the center line

            // Draw Label
            ctx.fillStyle = secondaryTextColor;
            ctx.font = detailLabelFont;
            const labelX = padding + iconSize + labelIconSpacing;
            const labelContent = labelText + ':'; // Add colon
            ctx.fillText(labelContent, labelX, verticalCenterY);

            // Draw Value
            ctx.fillStyle = primaryTextColor;
            ctx.font = detailValueFont; // Use bold font for value
            const labelWidth = ctx.measureText(labelContent).width;
            const valueX = labelX + labelWidth + valueLabelSpacing; // Position value after label + spacing
            const valueMaxWidth = width - padding - valueX; // Max width available for value
            ctx.fillText(valueText, valueX, verticalCenterY, valueMaxWidth); // Draw value, allow truncation if needed

            // Advance Y for the next item
            currentY += detailItemSpacing;
            ctx.textBaseline = 'alphabetic'; // Reset baseline
        };

        // Draw Details Horizontally
        drawDetailItemHorizontal('/assets/png/calendar.png', '日期', cardData.date);
        drawDetailItemHorizontal('/assets/png/file-digit.png', '类型', cardData.type);
        if (cardData.location && cardData.location.trim() !== '') {
            drawDetailItemHorizontal('/assets/png/map-pin.png', '地点', cardData.location);
        }

        // --- Draw Experience ---
        if (cardData.experience && cardData.experience.trim() !== '') {
            const experienceIconPath = '/assets/png/award.png';
            const experienceLabel = '心得体会';

            // Draw only the icon and label part first
            const drawLabelAndIconOnly = (iconPath, labelText) => {
                const icon = loadedImages[iconPath];
                const itemStartY = currentY;
                const verticalCenterY = itemStartY + detailItemSpacing / 2;
                const iconY = verticalCenterY - iconSize / 2;

                if (icon) ctx.drawImage(icon, padding, iconY, iconSize, iconSize);
                else { ctx.fillStyle = secondaryTextColor; ctx.fillRect(padding, iconY, iconSize, iconSize); }

                ctx.fillStyle = secondaryTextColor; ctx.font = detailLabelFont; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
                const labelX = padding + iconSize + labelIconSpacing;
                ctx.fillText(labelText + ':', labelX, verticalCenterY);
                ctx.textBaseline = 'alphabetic'; // Reset

                // *** Increase vertical space after the label line ***
                // Advance Y to start text below the label line with more clearance
                currentY += detailItemSpacing * 2; // Use full item spacing to move down
            };

            // Draw experience icon and label (uses the updated drawLabelAndIconOnly)
            drawLabelAndIconOnly(experienceIconPath, experienceLabel);

            // Draw experience value below the label using wrapText
            ctx.fillStyle = primaryTextColor;
            ctx.font = experienceFont; // Normal weight font
            const experienceStartX = padding + iconSize + labelIconSpacing; // Indent text
            const experienceMaxWidth = contentWidth - (iconSize + labelIconSpacing);
            // Use wrapText starting from the adjusted currentY
            currentY = wrapText(ctx, cardData.experience, experienceStartX, currentY, experienceMaxWidth, experienceLineHeight);
            // Adjust space *after* the experience text if needed
            currentY += detailItemSpacing * 0.3; // Reduced space after experience
        }

        // --- Footer Text ---
        ctx.fillStyle = footerTextColor;
        ctx.font = footerFont;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('继续攀登，突破自我', width / 2, height - footerHeight / 2);
        ctx.textBaseline = 'alphabetic';
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
  }
}) 