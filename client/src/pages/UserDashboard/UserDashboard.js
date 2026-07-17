import React, { useState, useEffect, useContext, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API, { resolveUploadUrl } from '../../services/api.js';
import { AuthContext } from '../../context/AuthContext.js';
import { translateToTelugu } from '../../services/translations.js';
import { downloadCanvasAsJpeg, downloadBlob, makeSafeFilename } from '../../services/downloadHelper.js';
import './UserDashboard.css';

export default function UserDashboard() {
  const { user, getGreeting, logout, language } = useContext(AuthContext);
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exportingOrderId, setExportingOrderId] = useState(null);
  const [exportProgress, setExportProgress] = useState(0);
  
  // Hidden Canvas Ref for background exports
  const canvasRef = useRef(null);

  useEffect(() => {
    const fetchMyOrders = async () => {
      try {
        setLoading(true);
        const { data } = await API.get('/orders/my-orders');
        if (data.success) {
          setOrders(data.data);
        }
      } catch (err) {
        console.error('Error fetching user dashboard orders:', err);
        setError(err.response?.data?.message || 'Failed to retrieve purchase orders.');
      } finally {
        setLoading(false);
      }
    };

    fetchMyOrders();
  }, []);

  const handleLogoutClick = () => {
    logout();
    navigate('/login');
  };

  const imageCacheRef = useRef({});

  // Preload template preview images and user base64 photos to ensure synchronous download and preserve user gesture context
  useEffect(() => {
    if (orders.length === 0) return;
    orders.forEach((ord) => {
      if (!ord.template) return;

      if (ord.template.type !== 'video' && ord.template.previewUrl) {
        const bgImg = new Image();
        bgImg.crossOrigin = 'anonymous';
        bgImg.src = resolveUploadUrl(ord.template.previewUrl);
        imageCacheRef.current[`bg_${ord._id}`] = bgImg;
      }

      const savedData = ord.customizedData || {};
      const photoSettings = savedData.photoSettings || {};
      if (photoSettings.hasPhoto && photoSettings.photoBase64) {
        const userImg = new Image();
        userImg.src = photoSettings.photoBase64;
        imageCacheRef.current[`user_${ord._id}`] = userImg;
      }
    });
  }, [orders]);

  const dataURLtoBlob = (dataUrl) => {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  // Reconstruct canvas drawing and download customized card image/video
  const handleDownloadCustomCard = (order) => {
    if (!order || !order.template) return;
    if (exportingOrderId) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const isVideo = order.template.type === 'video';

    if (isVideo) {
      setExportingOrderId(order._id);
      setExportProgress(0);

      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.src = order.template.fileUrl;
      video.muted = true;
      video.playsInline = true;
      video.loop = false;

      video.onloadeddata = () => {
        canvas.width = 600;
        canvas.height = 600;

        const savedData = order.customizedData || {};
        const photoSettings = savedData.photoSettings || {};
        const audioSettings = savedData.audioSettings || { audioOption: 'keep', trimStart: 0, trimEnd: video.duration || 10 };
        const audioOption = audioSettings.audioOption || 'keep';
        const trimStart = audioSettings.trimStart !== undefined ? audioSettings.trimStart : 0;
        const trimEnd = audioSettings.trimEnd !== undefined ? audioSettings.trimEnd : (video.duration || 10);
        const customAudioUrl = audioSettings.customAudioUrl || '';

        let userImg = null;
        let isUserImgLoaded = false;

        if (photoSettings.hasPhoto && photoSettings.photoBase64 && order.template.config?.photoBox) {
          userImg = new Image();
          userImg.src = photoSettings.photoBase64;
          userImg.onload = () => {
            isUserImgLoaded = true;
          };
        }

        video.currentTime = 0;
        video.play();

        // Setup Media Stream and Recorder
        const stream = canvas.captureStream(30);
        let options = { mimeType: 'video/webm;codecs=vp9' };
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          options = { mimeType: 'video/webm' };
        }
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          options = { mimeType: 'video/mp4' };
        }

        const mediaRecorder = new MediaRecorder(stream, options);
        const chunks = [];
        mediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunks.push(e.data);
        };

        mediaRecorder.onstop = async () => {
          active = false;
          try {
            setExportProgress(95);
            const webmBlob = new Blob(chunks, { type: options.mimeType });
            
            const formData = new FormData();
            formData.append('video', webmBlob, 'canvas_recording.webm');
            formData.append('templateId', order.template._id);
            formData.append('audioOption', audioOption);
            formData.append('trimStart', trimStart);
            formData.append('trimEnd', trimEnd);
            if (user && user.name) {
              formData.append('userName', user.name);
            }
            if (audioOption === 'replace' && customAudioUrl) {
              formData.append('customAudioUrl', customAudioUrl);
            }

            const { data } = await API.post('/templates/process-video', formData, {
              headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (data.success && data.fileUrl) {
              setExportProgress(100);
              const res = await fetch(data.fileUrl);
              const mp4Blob = await res.blob();
              
              await downloadBlob(mp4Blob, data.filename, {
                description: 'MP4 Video',
                accept: { 'video/mp4': ['.mp4'] },
              });
            } else {
              alert('Failed to process video audio track on the server.');
            }
          } catch (err) {
            console.error('Video post-processing failed:', err);
            alert('Error during video download processing. Please retry.');
          } finally {
            setExportingOrderId(null);
            setExportProgress(0);
            video.pause();
          }
        };

        // Frame rendering loop
        let active = true;
        const renderLoop = () => {
          if (!active) return;

          // Draw video background frame
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          // Draw user photo
          if (userImg && isUserImgLoaded && order.template.config.photoBox) {
            const box = order.template.config.photoBox;
            let photoSource = userImg;

            if (photoSettings.bgRemovalEnabled) {
              const offCanvas = document.createElement('canvas');
              const offCtx = offCanvas.getContext('2d');
              const w = userImg.naturalWidth || 500;
              const h = userImg.naturalHeight || 500;
              offCanvas.width = w;
              offCanvas.height = h;
              offCtx.drawImage(userImg, 0, 0, w, h);

              const imgData = offCtx.getImageData(0, 0, w, h);
              const data = imgData.data;
              const rTarget = parseInt(photoSettings.bgRemovalColor?.slice(1, 3) || 'ff', 16);
              const gTarget = parseInt(photoSettings.bgRemovalColor?.slice(3, 5) || 'ff', 16);
              const bTarget = parseInt(photoSettings.bgRemovalColor?.slice(5, 7) || 'ff', 16);
              const tolerance = photoSettings.bgRemovalTolerance !== undefined ? photoSettings.bgRemovalTolerance : 40;

              for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i+1];
                const b = data[i+2];
                const dist = Math.sqrt(
                  Math.pow(r - rTarget, 2) + Math.pow(g - gTarget, 2) + Math.pow(b - bTarget, 2)
                );
                if (dist < tolerance) data[i+3] = 0;
              }
              offCtx.putImageData(imgData, 0, 0);
              photoSource = offCanvas;
            }

            ctx.save();
            const scale = photoSettings.photoScale || 1.0;
            const offX = photoSettings.photoOffsetX || 0;
            const offY = photoSettings.photoOffsetY || 0;
            const rotation = photoSettings.photoRotation || 0;
            const flipH = photoSettings.photoFlipH || false;
            const flipV = photoSettings.photoFlipV || false;
            const brightness = photoSettings.photoBrightness !== undefined ? photoSettings.photoBrightness : 100;
            const contrast = photoSettings.photoContrast !== undefined ? photoSettings.photoContrast : 100;
            const saturation = photoSettings.photoSaturation !== undefined ? photoSettings.photoSaturation : 100;

            const centerX = box.x + box.width / 2;
            const centerY = box.y + box.height / 2;

            // Translate coordinates freely matching editor offsets
            ctx.translate(centerX + offX, centerY + offY);

            if (rotation) {
              ctx.rotate((rotation * Math.PI) / 180);
            }

            const scaleX = flipH ? -1 : 1;
            const scaleY = flipV ? -1 : 1;
            ctx.scale(scaleX, scaleY);

            // Draw backdrop behind photo centered at origin
            const drawWidth = box.width * scale;
            const drawHeight = box.height * scale;

            const frameBgType = photoSettings.frameBgType || 'none';
            const frameBgColor = photoSettings.frameBgColor || '#ffffff';
            if (frameBgType === 'white') {
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(-drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
            } else if (frameBgType === 'color') {
              ctx.fillStyle = frameBgColor;
              ctx.fillRect(-drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
            } else if (frameBgType === 'gradient-pinkblue') {
              const grad = ctx.createLinearGradient(-drawWidth / 2, -drawHeight / 2, drawWidth / 2, drawHeight / 2);
              grad.addColorStop(0, '#f472b6'); // pink
              grad.addColorStop(1, '#60a5fa'); // blue
              ctx.fillStyle = grad;
              ctx.fillRect(-drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
            } else if (frameBgType === 'gradient-sunset') {
              const grad = ctx.createLinearGradient(-drawWidth / 2, -drawHeight / 2, drawWidth / 2, drawHeight / 2);
              grad.addColorStop(0, '#f97316'); // orange
              grad.addColorStop(1, '#eab308'); // yellow
              ctx.fillStyle = grad;
              ctx.fillRect(-drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
            } else if (frameBgType === 'gradient-neon') {
              const grad = ctx.createLinearGradient(-drawWidth / 2, -drawHeight / 2, drawWidth / 2, drawHeight / 2);
              grad.addColorStop(0, '#a855f7'); // purple
              grad.addColorStop(1, '#06b6d4'); // cyan
              ctx.fillStyle = grad;
              ctx.fillRect(-drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
            }

            if (ctx.filter !== undefined) {
              ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
            }

            ctx.drawImage(
              photoSource,
              -drawWidth / 2,
              -drawHeight / 2,
              drawWidth,
              drawHeight
            );
            ctx.restore();
          }

          // Draw texts
          if (order.template.config?.texts) {
            const textPositions = savedData.textPositions || {};
            order.template.config.texts.forEach((textSpec) => {
              ctx.save();
              ctx.textBaseline = 'middle';
              ctx.textAlign = textSpec.align || 'left';
              const weight = textSpec.fontWeight || 'normal';
              const customStyles = savedData.textStyles || {};
              const textStyle = customStyles[textSpec.id] || {};
              const size = textStyle.fontSize || textSpec.fontSize || 24;
              const family = textStyle.fontFamily || textSpec.fontFamily || 'Outfit';

              ctx.font = `${weight} ${size}px ${family}, "NTR", sans-serif`;
              ctx.fillStyle = textStyle.color || textSpec.color || '#FFFFFF';

              ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
              ctx.shadowBlur = 4;
              ctx.shadowOffsetX = 2;
              ctx.shadowOffsetY = 2;

              const textValues = savedData.textValues || {};
              const val = textValues[textSpec.id] !== undefined ? textValues[textSpec.id] : textSpec.defaultValue;
              const displayVal = language === 'te' ? translateToTelugu(val) : val;

              const pos = textPositions[textSpec.id] || { x: textSpec.x, y: textSpec.y };
              ctx.fillText(displayVal, pos.x, pos.y);
              ctx.restore();
            });
          }

          requestAnimationFrame(renderLoop);
        };

        renderLoop();
        mediaRecorder.start();

        const duration = video.duration || 5;
        let elapsed = 0;
        const interval = setInterval(() => {
          elapsed += 0.5;
          setExportProgress(Math.min(90, Math.round((elapsed / duration) * 90)));
        }, 500);

        video.onended = () => {
          clearInterval(interval);
          if (mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
          }
        };

        const backupTimeout = setTimeout(() => {
          clearInterval(interval);
          if (mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
          }
        }, (duration * 1000) + 1500);
      };

      video.onerror = () => {
        alert('Failed to load video source for download.');
        setExportingOrderId(null);
      };

    } else {
      // Synchronous drawing if cached
      const bgImg = imageCacheRef.current[`bg_${order._id}`];
      const userImg = imageCacheRef.current[`user_${order._id}`];
      
      const savedData = order.customizedData || {};
      const photoSettings = savedData.photoSettings || {};
      const needsUserImg = photoSettings.hasPhoto && photoSettings.photoBase64;
      
      const canDrawSync = bgImg && bgImg.complete && (!needsUserImg || (userImg && userImg.complete));
      
      const performDrawAndDownload = (loadedBg, loadedUser) => {
        canvas.width = 600;
        canvas.height = 600;
        ctx.drawImage(loadedBg, 0, 0, 600, 600);
        
        const drawTextsAndDownload = async () => {
          if (order.template.config?.texts) {
            const textPositions = savedData.textPositions || {};
            order.template.config.texts.forEach((textSpec) => {
              ctx.save();
              ctx.textBaseline = 'middle';
              ctx.textAlign = textSpec.align || 'left';
              
              const weight = textSpec.fontWeight || 'normal';
              const customStyles = savedData.textStyles || {};
              const textStyle = customStyles[textSpec.id] || {};
              const size = textStyle.fontSize || textSpec.fontSize || 24;
              const family = textStyle.fontFamily || textSpec.fontFamily || 'Outfit';
              
              ctx.font = `${weight} ${size}px ${family}, "NTR", sans-serif`;
              ctx.fillStyle = textStyle.color || textSpec.color || '#FFFFFF';

              ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
              ctx.shadowBlur = 4;
              ctx.shadowOffsetX = 2;
              ctx.shadowOffsetY = 2;

              const textValues = savedData.textValues || {};
              const val = textValues[textSpec.id] !== undefined ? textValues[textSpec.id] : textSpec.defaultValue;
              const displayVal = language === 'te' ? translateToTelugu(val) : val;
              
              const pos = textPositions[textSpec.id] || { x: textSpec.x, y: textSpec.y };
              ctx.fillText(displayVal, pos.x, pos.y);
              ctx.restore();
            });
          }

          try {
            const fileName = makeSafeFilename(order.template.title, '_customized', 'jpg');
            await downloadCanvasAsJpeg(canvas, fileName);
          } catch (err) {
            console.error('Image download failed:', err);
            alert('Failed to generate image download.');
          }
        };

        if (needsUserImg && loadedUser && order.template.config?.photoBox) {
          const box = order.template.config.photoBox;
          let photoSource = loadedUser;
          
          if (photoSettings.bgRemovalEnabled) {
            const offCanvas = document.createElement('canvas');
            const offCtx = offCanvas.getContext('2d');
            const w = loadedUser.naturalWidth || 500;
            const h = loadedUser.naturalHeight || 500;
            offCanvas.width = w;
            offCanvas.height = h;
            
            offCtx.drawImage(loadedUser, 0, 0, w, h);
            
            const imgData = offCtx.getImageData(0, 0, w, h);
            const data = imgData.data;
            
            const rTarget = parseInt(photoSettings.bgRemovalColor?.slice(1, 3) || 'ff', 16);
            const gTarget = parseInt(photoSettings.bgRemovalColor?.slice(3, 5) || 'ff', 16);
            const bTarget = parseInt(photoSettings.bgRemovalColor?.slice(5, 7) || 'ff', 16);
            const tolerance = photoSettings.bgRemovalTolerance !== undefined ? photoSettings.bgRemovalTolerance : 40;
            
            for (let i = 0; i < data.length; i += 4) {
              const r = data[i];
              const g = data[i+1];
              const b = data[i+2];
              
              const dist = Math.sqrt(
                Math.pow(r - rTarget, 2) +
                Math.pow(g - gTarget, 2) +
                Math.pow(b - bTarget, 2)
              );
              
              if (dist < tolerance) {
                data[i+3] = 0;
              }
            }
            offCtx.putImageData(imgData, 0, 0);
            photoSource = offCanvas;
          }
          
          ctx.save();
          const scale = photoSettings.photoScale || 1.0;
          const offX = photoSettings.photoOffsetX || 0;
          const offY = photoSettings.photoOffsetY || 0;
          const rotation = photoSettings.photoRotation || 0;
          const flipH = photoSettings.photoFlipH || false;
          const flipV = photoSettings.photoFlipV || false;
          const brightness = photoSettings.photoBrightness !== undefined ? photoSettings.photoBrightness : 100;
          const contrast = photoSettings.photoContrast !== undefined ? photoSettings.photoContrast : 100;
          const saturation = photoSettings.photoSaturation !== undefined ? photoSettings.photoSaturation : 100;

          const centerX = box.x + box.width / 2;
          const centerY = box.y + box.height / 2;

          ctx.translate(centerX + offX, centerY + offY);

          if (rotation) {
            ctx.rotate((rotation * Math.PI) / 180);
          }

          const scaleX = flipH ? -1 : 1;
          const scaleY = flipV ? -1 : 1;
          ctx.scale(scaleX, scaleY);

          const drawWidth = box.width * scale;
          const drawHeight = box.height * scale;

          const frameBgType = photoSettings.frameBgType || 'none';
          const frameBgColor = photoSettings.frameBgColor || '#ffffff';
          if (frameBgType === 'white') {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(-drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
          } else if (frameBgType === 'color') {
            ctx.fillStyle = frameBgColor;
            ctx.fillRect(-drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
          } else if (frameBgType === 'gradient-pinkblue') {
            const grad = ctx.createLinearGradient(-drawWidth / 2, -drawHeight / 2, drawWidth / 2, drawHeight / 2);
            grad.addColorStop(0, '#f472b6'); // pink
            grad.addColorStop(1, '#60a5fa'); // blue
            ctx.fillStyle = grad;
            ctx.fillRect(-drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
          } else if (frameBgType === 'gradient-sunset') {
            const grad = ctx.createLinearGradient(-drawWidth / 2, -drawHeight / 2, drawWidth / 2, drawHeight / 2);
            grad.addColorStop(0, '#f97316'); // orange
            grad.addColorStop(1, '#eab308'); // yellow
            ctx.fillStyle = grad;
            ctx.fillRect(-drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
          } else if (frameBgType === 'gradient-neon') {
            const grad = ctx.createLinearGradient(-drawWidth / 2, -drawHeight / 2, drawWidth / 2, drawHeight / 2);
            grad.addColorStop(0, '#a855f7'); // purple
            grad.addColorStop(1, '#06b6d4'); // cyan
            ctx.fillStyle = grad;
            ctx.fillRect(-drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
          }

          if (ctx.filter !== undefined) {
            ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
          }

          ctx.drawImage(
            photoSource,
            -drawWidth / 2,
            -drawHeight / 2,
            drawWidth,
            drawHeight
          );
          ctx.restore();
          
          drawTextsAndDownload();
        } else {
          drawTextsAndDownload();
        }
      };

      if (canDrawSync) {
        performDrawAndDownload(bgImg, userImg);
      } else {
        // Fallback to async drawing if not fully loaded yet
        const fallBg = new Image();
        fallBg.crossOrigin = 'anonymous';
        fallBg.src = resolveUploadUrl(order.template.previewUrl);
        fallBg.onload = () => {
          if (needsUserImg) {
            const fallUser = new Image();
            fallUser.src = photoSettings.photoBase64;
            fallUser.onload = () => {
              performDrawAndDownload(fallBg, fallUser);
            };
          } else {
            performDrawAndDownload(fallBg, null);
          }
        };
      }
    }
  };

  // Download high quality package asset directly to PC downloads folder
  const handleDownloadOriginalAsset = async (templateId, templateTitle) => {
    try {
      const { data } = await API.get(`/orders/download/${templateId}`);
      if (data.success) {
        if (!data.fileUrl) {
          alert('No template source package file is available for this template. You can still download your customized image.');
          return;
        }
        // Fetch as blob to force browser to download
        const response = await fetch(data.fileUrl);
        const blob = await response.blob();
        
        let ext = 'zip';
        const match = data.fileUrl.match(/\.(jpeg|jpg|png|gif|mp4|webm|zip|rar)/i);
        ext = match ? match[1] : 'zip';
        
        const fileName = makeSafeFilename(templateTitle || 'template', '_source', ext);
        await downloadBlob(blob, fileName, {
          description: 'Template Source File',
          accept: { [blob.type || 'application/octet-stream']: [`.${ext}`] },
        });
      }
    } catch (err) {
      console.error('Download original error:', err);
      alert('Could not download original template asset directly. Please retry.');
    }
  };

  if (loading) {
    return (
      <div className="loader-container">
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <div className="dashboard-page max-width-container fade-in-up">
      
      {/* Header Profile Greeting Card */}
      <div className="profile-banner-card glass-card">
        <div className="profile-info-block">
          <div className="profile-avatar-placeholder">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="profile-text-details">
            <h2>{getGreeting()}</h2>
            <p className="profile-email-desc">{user?.email}</p>
            <span className="profile-role-badge">{user?.role === 'admin' ? 'Administrator' : 'Premium Member'}</span>
          </div>
        </div>
        <div className="profile-actions-block">
          {user?.role === 'admin' && (
            <Link to="/admin" className="btn btn-secondary admin-panel-nav-btn">
              ⚙️ Admin Panel
            </Link>
          )}
          <button onClick={handleLogoutClick} className="btn btn-danger logout-btn">
            Logout
          </button>
        </div>
      </div>

      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <div className="dashboard-body">
        <div className="dashboard-header-row">
          <h2>My Purchased <span>Templates</span></h2>
          <span className="purchased-count-label">{orders.length} Templates Unlocked</span>
        </div>

        {error && <div className="alert-message error-alert">{error}</div>}

        {orders.length === 0 ? (
          <div className="empty-dashboard-card glass-card">
            <h3>No purchases yet</h3>
            <p>Unlock premium designs and campaign cards to start customizing and exporting downloads.</p>
            <Link to="/templates" className="btn btn-primary">Browse Premium Templates</Link>
          </div>
        ) : (
          <div className="dashboard-orders-grid">
            {orders.map((ord) => {
              const dateStr = new Date(ord.createdAt).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              });

              return (
                <div key={ord._id} className="order-item-card glass-card">
                  
                  {/* Order Preview Image */}
                  <div 
                    className="order-image-preview" 
                    style={{ backgroundImage: `url(${resolveUploadUrl(ord.template?.previewUrl)})` }}
                  />

                  {/* Order Details */}
                  <div className="order-details-pane">
                    <div className="order-meta-info-row">
                      <span className="order-cat-tag">{ord.template?.category?.name || 'Category'}</span>
                      <span className="order-date-tag">Purchased: {dateStr}</span>
                    </div>

                    <h3>{ord.template?.title}</h3>
                    <p className="order-description-text">{ord.template?.description}</p>
                    
                    <div className="order-reference-row">
                      <span>Ref ID: {ord.orderId}</span>
                      <span className="status-badge-paid">✓ Paid (₹{ord.amount})</span>
                    </div>

                    {/* Dashboard Card CTA links */}
                    <div className="order-actions-pane">
                      <Link 
                        to={`/templates/${ord.template?._id}`}
                        className="btn btn-primary btn-sm flex-1-btn"
                      >
                        🎨 Customize Design
                      </Link>
                      
                      <button 
                        onClick={() => handleDownloadCustomCard(ord)}
                        className="btn btn-secondary btn-sm flex-1-btn"
                        disabled={exportingOrderId !== null}
                      >
                        {exportingOrderId === ord._id 
                          ? `⏳ Exporting (${exportProgress}%)` 
                          : ord.template?.type === 'video' 
                            ? '📥 Download Video' 
                            : '📥 Download Image'
                        }
                      </button>
                    </div>

                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
