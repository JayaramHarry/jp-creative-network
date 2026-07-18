import React, { useState, useEffect, useRef, useContext } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import API, { resolveUploadUrl } from '../../services/api.js';
import { AuthContext } from '../../context/AuthContext.js';
import { translateToTelugu } from '../../services/translations.js';
import { downloadCanvasAsJpeg, downloadBlob, makeSafeFilename } from '../../services/downloadHelper.js';
import './PaymentSuccess.css';

export default function PaymentSuccess() {
  const { language } = useContext(AuthContext);
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);

  // Hidden canvas refs for localized generation
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!orderId) {
      setError('Missing order identifier reference.');
      setLoading(false);
      return;
    }

    const fetchOrderDetails = async () => {
      try {
        setLoading(true);
        const { data } = await API.get(`/orders/${orderId}`);
        if (data.success) {
          if (data.data.status !== 'paid') {
            setError('Payment verification is pending or failed. Download access is locked.');
          } else {
            setOrder(data.data);
          }
        }
      } catch (err) {
        console.error('Error fetching order receipt:', err);
        setError('Verification receipt lookup failed.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [orderId]);

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

  // Pre-render the canvas once order details are loaded to ensure synchronous download and preserve user gesture context
  useEffect(() => {
    if (!order || !order.template || order.template.type === 'video') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const bgImg = new Image();
    bgImg.crossOrigin = 'anonymous';
    bgImg.src = resolveUploadUrl(order.template.previewUrl);

    const savedData = order.customizedData || {};
    const photoSettings = savedData.photoSettings || {};

    const drawTexts = () => {
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
    };

    bgImg.onload = () => {
      canvas.width = 600;
      canvas.height = 600;
      ctx.drawImage(bgImg, 0, 0, 600, 600);

      if (photoSettings.hasPhoto && photoSettings.photoBase64 && order.template.config?.photoBox) {
        const userImg = new Image();
        userImg.src = photoSettings.photoBase64;
        
        userImg.onload = () => {
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
          
          drawTexts();
        };
        
        userImg.onerror = () => {
          drawTexts();
        };
      } else {
        drawTexts();
      }
    };
  }, [order]);

  // Download high-quality customized image/video directly from browser
  const handleDownloadCustom = async () => {
    if (!order || !order.template) return;
    setDownloading(true);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const isVideo = order.template.type === 'video';

    if (isVideo) {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.src = order.template.fileUrl;
      video.muted = true;
      video.playsInline = true;

      video.onloadeddata = () => {
        canvas.width = 600;
        canvas.height = 600;

        const savedData = order.customizedData || {};
        const photoSettings = savedData.photoSettings || {};

        let userImg = null;
        let isUserImgLoaded = false;

        if (photoSettings.hasPhoto && photoSettings.photoBase64 && order.template.config?.photoBox) {
          userImg = new Image();
          userImg.src = photoSettings.photoBase64;
          userImg.onload = () => {
            isUserImgLoaded = true;
          };
        }

        video.play();

        // Setup stream recording
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
          const fileExt = options.mimeType.includes('mp4') ? 'mp4' : 'webm';
          const blob = new Blob(chunks, { type: options.mimeType });
          const fileName = makeSafeFilename(order.template.title, '_customized', fileExt);
          
          await downloadBlob(blob, fileName, {
            description: fileExt === 'mp4' ? 'MP4 Video' : 'WebM Video',
            accept: { [options.mimeType]: [`.${fileExt}`] },
          });
          video.pause();
          setDownloading(false);
        };

        // Frame rendering loop
        let active = true;
        const renderLoop = () => {
          if (!active) return;

          // Draw background video frame
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

            // Translate to photo position freely
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

        setTimeout(() => {
          active = false;
          mediaRecorder.stop();
        }, 5000);
      };

      video.onerror = () => {
        setDownloading(false);
        alert('Failed to load video source for download.');
      };

    } else {
      // Standard image download
      try {
        const fileName = makeSafeFilename(order.template.title, '_customized', 'jpg');
        await downloadCanvasAsJpeg(canvas, fileName);
      } catch (err) {
        console.error('Image download failed:', err);
        alert('Failed to generate image download.');
      } finally {
        setDownloading(false);
      }
    }
  };

  // Download high quality project source files/vector zip files directly to PC downloads folder
  const handleDownloadOriginal = async () => {
    if (!order || !order.template) return;
    try {
      const { data } = await API.get(`/orders/download/${order.template._id}`);
      if (data.success) {
        if (!data.fileUrl) {
          alert('No template source package file is available for this template. You can still download your customized image.');
          return;
        }
        // Fetch as blob to force browser to download
        const response = await fetch(data.fileUrl);
        const blob = await response.blob();
        
        let ext = 'zip';
        if (order.template.type === 'video') {
          ext = 'mp4';
        } else {
          const match = data.fileUrl.match(/\.(jpeg|jpg|png|gif|mp4|webm|zip|rar)/i);
          ext = match ? match[1] : 'zip';
        }
        
        const fileName = makeSafeFilename(order.template.title, '_source', ext);
        await downloadBlob(blob, fileName, {
          description: 'Template Source File',
          accept: { [blob.type || 'application/octet-stream']: [`.${ext}`] },
        });
      }
    } catch (err) {
      console.error('Download original error:', err);
      alert('Could not download template asset. Please contact support.');
    }
  };

  if (loading) {
    return (
      <div className="loader-container">
        <div className="loader"></div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="payment-error-page max-width-container">
        <div className="glass-card error-card">
          <h2>Payment Verification Failed</h2>
          <p>{error || 'Order lookup failed.'}</p>
          <Link to="/templates" className="btn btn-primary">Browse Templates</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="success-page max-width-container fade-in-up">
      <div className="success-card glass-card">
        
        {/* Animated Checkmark Badge */}
        <div className="success-icon-badge">
          <div className="success-checkmark-circle">
            <span className="success-checkmark"></span>
          </div>
        </div>

        <h1>Payment Successful!</h1>
        <p className="success-subtext">Thank you for your purchase. Your template is now unlocked.</p>
        
        <div className="receipt-details">
          <div className="receipt-row">
            <span>Template Name</span>
            <strong>{order.template?.title}</strong>
          </div>
          <div className="receipt-row">
            <span>Paid Amount</span>
            <strong className="receipt-amount">₹{order.amount}</strong>
          </div>
          <div className="receipt-row">
            <span>Order Reference ID</span>
            <span>{order.orderId}</span>
          </div>
          <div className="receipt-row">
            <span>Transaction Reference ID</span>
            <span>{order.paymentId || 'N/A'}</span>
          </div>
          <div className="receipt-row">
            <span>Payment Status</span>
            <span className="status-paid-badge">PAID</span>
          </div>
        </div>

        {/* Hidden rendering canvas */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        <div className="success-actions-row">
          <button 
            onClick={handleDownloadCustom}
            disabled={downloading}
            className="btn btn-primary flex-1"
          >
            {downloading ? 'Generating...' : order.template?.type === 'video' ? '📥 Export & Download Video' : '📥 Download Customized Image'}
          </button>
        </div>

        <div className="dashboard-navigation-link">
          <Link to="/dashboard" className="back-to-dashboard-btn">
            Go to User Dashboard &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
