/**
 * 按日期对记录进行排序（最新的排在前面）
 */
const sortRecordsByDate = records => {
  return [...records].sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return dateB - dateA;  // 降序排列，最新的在前面
  });
}

/**
 * Helper function to load multiple images for canvas drawing.
 * @param {object} canvas - The canvas node.
 * @param {Array<string>} imageUrls - An array of image paths relative to the project root.
 * @returns {Promise<object>} A promise that resolves with an object mapping original URLs to loaded image objects.
 */
const loadImages = (canvas, imageUrls) => {
  return new Promise((resolve, reject) => {
    if (!imageUrls || imageUrls.length === 0) {
      resolve({}); // Resolve with empty object if no images needed
      return;
    }
    const imagePromises = [];
    const loadedImages = {};

    imageUrls.forEach(url => {
      const promise = new Promise((resolveImage, rejectImage) => {
        const img = canvas.createImage();
        img.onload = () => {
          loadedImages[url] = img; // Store loaded image using URL as key
          console.log(`Image loaded: ${url}`);
          resolveImage();
        };
        img.onerror = (err) => {
          console.error(`Failed to load image: ${url}`, err);
          // Resolve even if one image fails, so drawing can proceed partially
          // Or rejectImage(new Error(`Failed to load image: ${url}`)); if all images are critical
          resolveImage();
        };
        img.src = url;
      });
      imagePromises.push(promise);
    });

    Promise.all(imagePromises)
      .then(() => resolve(loadedImages))
      .catch(reject); // Should ideally not be reached if individual errors resolve
  });
};

/**
 * 通用保存卡片到相册函数
 * @param {string} canvasId - Canvas 元素的 ID (e.g., '#cardCanvas')
 * @param {object} pageInstance - 调用页面的 this 上下文
 * @param {function} drawFunction - 绘制卡片内容的函数 (接受 ctx, canvas, cardData, width, height, loadedImages 作为参数)
 * @param {object} cardData - 需要绘制到卡片上的数据
 * @param {Array<string>} requiredImages - Array of image paths needed for this card.
 */
const saveCardToAlbum = (canvasId, pageInstance, drawFunction, cardData, requiredImages = []) => {
  if (!cardData) {
    console.error('No card data provided to saveCardToAlbum');
    wx.showToast({ title: '数据错误', icon: 'none' });
    return;
  }

  wx.showLoading({
    title: '正在生成图片...',
    mask: true
  });

  const query = wx.createSelectorQuery().in(pageInstance);
  query.select(canvasId).fields({
    node: true,
    size: true,
  }).exec(async (res) => {
    if (!res[0] || !res[0].node) {
      wx.hideLoading();
      wx.showToast({
        title: '找不到Canvas',
        icon: 'none'
      });
      console.error(`Canvas element with ID ${canvasId} not found.`);
      return;
    }

    const canvas = res[0].node;
    const ctx = canvas.getContext('2d');

    // --- Canvas Dimensions ---
    // Use a standard size, ensure it matches the style in WXML
    const canvasWidth = 600;
    const canvasHeight = 800;
    const dpr = wx.getSystemInfoSync().pixelRatio || 1; // Use 1 as fallback
    canvas.width = canvasWidth * dpr;
    canvas.height = canvasHeight * dpr;
    ctx.scale(dpr, dpr);

    // --- Clear Canvas ---
    // Set a default background, drawFunction can override if needed
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    try {
      // --- Load Required Images ---
      let loadedImages = {};
      if (requiredImages && requiredImages.length > 0) {
        try {
          loadedImages = await loadImages(canvas, requiredImages);
          console.log('All required images loaded (or attempted).');
        } catch (imgErr) {
          console.error("Error loading images:", imgErr);
          // Decide if you want to proceed without images or show an error
          // wx.hideLoading();
          // wx.showToast({ title: '图片加载失败', icon: 'none' });
          // return;
        }
      }

      // --- Call the Specific Drawing Function ---
      drawFunction(ctx, canvas, cardData, canvasWidth, canvasHeight, loadedImages);

      // --- Save Image ---
      wx.canvasToTempFilePath({
        canvas: canvas,
        success: (tempRes) => {
          wx.saveImageToPhotosAlbum({
            filePath: tempRes.tempFilePath,
            success: () => {
              wx.hideLoading();
              wx.showToast({
                title: '保存成功',
                icon: 'success'
              });
            },
            fail: (saveErr) => {
              wx.hideLoading();
              // Handle authorization denial
              if (saveErr.errMsg && (saveErr.errMsg.includes('auth deny') || saveErr.errMsg.includes('auth denied'))) {
                 wx.showModal({
                    title: '授权提示',
                    content: '需要您授权保存图片到相册才能使用该功能。是否前往设置？',
                    confirmText: "去设置",
                    cancelText: "算了",
                    success: modalRes => {
                      if (modalRes.confirm) {
                        wx.openSetting(); // Guide user to settings
                      }
                    }
                  })
              } else {
                wx.showToast({
                  title: '保存失败',
                  icon: 'none'
                });
                console.error('保存图片到相册失败:', saveErr);
              }
            }
          });
        },
        fail: (tempErr) => {
          wx.hideLoading();
          wx.showToast({
            title: '生成图片失败',
            icon: 'none'
          });
          console.error('生成图片临时文件失败:', tempErr);
        }
      });
    } catch (drawError) {
      wx.hideLoading();
      wx.showToast({
        title: '绘制卡片出错',
        icon: 'none'
      });
      console.error('绘制卡片时出错:', drawError);
    }
  });
};

// Helper function for text wrapping (used by drawing functions)
const wrapText = (context, text, x, y, maxWidth, lineHeight) => {
    if (!text) return y; // Return current Y if no text
    const words = text.split(''); // Wrap character by character for CJK/mixed scripts
    let line = '';
    let currentY = y;
    // Ensure font is set before measuring/drawing
    // context.font = '...'; // Set the desired font here or ensure it's set before calling

    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n];
        try {
            const metrics = context.measureText(testLine);
            const testWidth = metrics.width;
            if (testWidth > maxWidth && line.length > 0) { // Check line.length to avoid issues with single long characters
                context.fillText(line, x, currentY);
                line = words[n];
                currentY += lineHeight;
            } else {
                line = testLine;
            }
        } catch (e) {
            console.error("Error measuring text:", e, "Line:", testLine);
            // Handle error, maybe break or skip?
            line = testLine; // Continue building line cautiously
        }
    }
    if (line.length > 0) {
        context.fillText(line, x, currentY);
    }
    return currentY + (line.length > 0 ? lineHeight : 0); // Return the Y position after the last line
};

module.exports = {
  sortRecordsByDate: sortRecordsByDate,
  saveCardToAlbum: saveCardToAlbum,
  wrapText: wrapText,
  // No need to export loadImages, it's used internally by saveCardToAlbum
};
