import React, { useState, useEffect, useRef, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import API from '../../services/api.js';
import { AuthContext } from '../../context/AuthContext.js';
import { downloadBlob } from '../../services/downloadHelper.js';
import { translateToTelugu } from '../../services/translations.js';
import './TemplateDetail.css';
import ManualEraserModal from '../../components/ManualEraserModal/ManualEraserModal.js';
import { PRESET_CATEGORIES, PRESET_ITEMS } from './presetsData.js';

// Pre-defined Font Options
const FONT_OPTIONS = [
  'Outfit', 'Inter', 'Roboto', 'Poppins', 'Montserrat', 'Playfair Display',
  'Suranna', 'NTR', 'Ramabhadra', 'Gidugu', 'sans-serif', 'serif'
];

export default function TemplateDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, t, language, toggleLanguage } = useContext(AuthContext);

  // Load state
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPurchased, setIsPurchased] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  // Editor states
  const [layers, setLayers] = useState([]);
  const [activeLayerId, setActiveLayerId] = useState(null);
  const [activeTab, setActiveTab] = useState('layers'); // 'layers', 'text', 'uploads', 'presets', 'audio', 'properties', 'admin'
  const [zoomScale, setZoomScale] = useState(0.4);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(10);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // Crop Modal States
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [cropBox, setCropBox] = useState({ left: 0, right: 0, top: 0, bottom: 0 });
  const [cropZoom, setCropZoom] = useState(1.0);
  const [cropRotation, setCropRotation] = useState(0);
  const [cropFlipH, setCropFlipH] = useState(false);
  const [cropFlipV, setCropFlipV] = useState(false);
  const [cropOffsetX, setCropOffsetX] = useState(0);
  const [cropOffsetY, setCropOffsetY] = useState(0);
  const [cropAspectRatio, setCropAspectRatio] = useState('Free');
  const [cropBgRemovalEnabled, setCropBgRemovalEnabled] = useState(false);
  const [cropBgRemovalColor, setCropBgRemovalColor] = useState('#ffffff');
  const [cropBgRemovalTolerance, setCropBgRemovalTolerance] = useState(40);
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const [bgRemovalError, setBgRemovalError] = useState(null);
  const [isEraserModalOpen, setIsEraserModalOpen] = useState(false);
  const [isPreprocessingImage, setIsPreprocessingImage] = useState(false);
  const [contextMenu, setContextMenu] = useState(null); // { x, y, layerId }

  // Presets Library Search and Filter States
  const [presetSearch, setPresetSearch] = useState('');
  const [selectedPresetCategory, setSelectedPresetCategory] = useState('all');
  const [dynamicPresets, setDynamicPresets] = useState([]);

  // Calculate activeLayer at top level
  const activeLayer = layers.find(l => l.id === activeLayerId);

  // History stack for Undo/Redo
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Audio system states
  const [audioOption, setAudioOption] = useState('keep'); // 'keep', 'replace', 'mute'
  const [customAudioFile, setCustomAudioFile] = useState(null);
  const [customAudioUrl, setCustomAudioUrl] = useState('');
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(10);
  const [originalVolume, setOriginalVolume] = useState(1.0);
  const [customAudioVolume, setCustomAudioVolume] = useState(1.0);
  const [bgMusicFile, setBgMusicFile] = useState(null);
  const [bgMusicUrl, setBgMusicUrl] = useState('');
  const [bgMusicVolume, setBgMusicVolume] = useState(0.5);

  // Upload/gallery database
  const [uploadGallery, setUploadGallery] = useState([]);

  // Refs
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const audioPreviewRef = useRef(null);
  const bgMusicPreviewRef = useRef(null);
  const cropCanvasRef = useRef(null);
  const touchTimerRef = useRef(null);
  const currentTimeRef = useRef(0);
  const layersRef = useRef(layers);
  const drawCanvasRef = useRef(null);
  const activePointersRef = useRef(new Map());
  const lastActionTimeRef = useRef(0);
  const mobileTextInputRef = useRef(null);
  const canvasMobileTextInputRef = useRef(null);
  const lastTapRef = useRef({ time: 0, layerId: null });
  const createdObjectUrlsRef = useRef([]);

  const focusCanvasMobileTextInput = () => {
    if (canvasMobileTextInputRef.current) {
      canvasMobileTextInputRef.current.focus();
      const len = canvasMobileTextInputRef.current.value.length;
      canvasMobileTextInputRef.current.setSelectionRange(len, len);
    }
  };

  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      createdObjectUrlsRef.current.forEach(url => {
        try {
          URL.revokeObjectURL(url);
          console.log('[Cleanup] Revoked object URL on unmount:', url);
        } catch (e) {
          console.warn('Failed to revoke URL on unmount:', url, e);
        }
      });
    };
  }, []);

  // Always keep layersRef in sync with the latest layers state
  useEffect(() => {
    layersRef.current = layers;
  }, [layers]);

  // Load dynamic presets uploaded by Admin
  useEffect(() => {
    const fetchDynamicPresets = async () => {
      try {
        const { data } = await API.get('/presets');
        if (data.success) {
          setDynamicPresets(data.data);
        }
      } catch (err) {
        console.error('Failed to fetch dynamic presets:', err);
      }
    };
    fetchDynamicPresets();
  }, []);

  // Auto-focus text input on mobile/tablet when a text layer is selected and Text tab is active
  useEffect(() => {
    if (activeTab === 'text' && activeLayer && activeLayer.type === 'text') {
      const focusInput = () => {
        if (mobileTextInputRef.current) {
          mobileTextInputRef.current.focus();
          const len = mobileTextInputRef.current.value.length;
          mobileTextInputRef.current.setSelectionRange(len, len);
        }
      };
      // Try focusing in the next frame
      requestAnimationFrame(focusInput);
      // Fallback timeout for touch keyboards
      const timer = setTimeout(focusInput, 150);
      return () => clearTimeout(timer);
    }
  }, [activeLayerId, activeTab, activeLayer]);

  // Timescale computation including 10s buffer space
  const origDur = template?.type === 'video' && videoRef.current?.duration ? videoRef.current.duration : 10;
  const timelineScaleDuration = Math.max(duration, origDur + 10, 30);

  // Calculate background template video time position by shifting out finished sequential inserts
  // Uses layersRef.current to always read the latest layers (avoids stale closures in tick loop)
  const getTemplateTime = (t) => {
    const currentLayers = layersRef.current;
    const inserts = currentLayers
      .filter(l => (l.type === 'image' || l.type === 'video') && l.playbackMode === 'insert')
      .sort((a, b) => a.startTime - b.startTime);

    let offset = 0;
    for (const insert of inserts) {
      if (t >= insert.endTime) {
        offset += (insert.endTime - insert.startTime);
      } else if (t >= insert.startTime) {
        return Math.max(0, insert.startTime - offset);
      }
    }
    return Math.max(0, t - offset);
  };

  // Drag states for crop modal image panning
  const [isDraggingCropPhoto, setIsDraggingCropPhoto] = useState(false);
  const dragCropStartRef = useRef({ x: 0, y: 0 });
  const dragCropOffsetStartRef = useRef({ x: 0, y: 0 });

  // Dynamic Google Fonts Loader
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;700;900&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Suranna&family=NTR&family=Ramabhadra&family=Gidugu&display=swap';
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  // Auto-fit Zoom Scale for mobile viewports
  useEffect(() => {
    const handleAutoFit = () => {
      const w = window.innerWidth;
      if (w < 480) {
        setZoomScale(0.28);
      } else if (w < 768) {
        setZoomScale(0.35);
      } else if (w < 1024) {
        setZoomScale(0.4);
      } else {
        setZoomScale(0.48);
      }
    };
    handleAutoFit();
    window.addEventListener('resize', handleAutoFit);
    return () => window.removeEventListener('resize', handleAutoFit);
  }, []);

  // Sync loaded image/video elements
  useEffect(() => {
    layers.forEach(layer => {
      if ((layer.type === 'image' || layer.type === 'symbol' || layer.type === 'background') && layer.url && !layer.imageObj) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = layer.url;
        img.onload = () => {
          setLayers(prev => prev.map(l => l.id === layer.id ? { ...l, imageObj: img } : l));
        };
      } else if (layer.type === 'video' && layer.url && !layer.videoObj) {
        const video = document.createElement('video');
        video.crossOrigin = 'anonymous';
        video.src = layer.url;
        video.muted = true;
        video.playsInline = true;
        video.onloadedmetadata = () => {
          setLayers(prev => prev.map(l => l.id === layer.id ? { ...l, videoObj: video } : l));
        };
      }
    });
  }, [layers]);

  // Load Template metadata
  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        setLoading(true);
        const { data } = await API.get(`/templates/${id}`);
        if (data.success) {
          const tpl = data.data;
          setTemplate(tpl);
          
          if (tpl.type === 'video') {
            setDuration(15);
            setTrimEnd(15);
            setIsPlaying(true);
          }

          // Initial layer config
          if (tpl.config && tpl.config.layers && tpl.config.layers.length > 0) {
            const loadedLayers = tpl.config.layers.map(l => {
              if (l.type === 'image' || l.type === 'symbol') {
                return {
                  ...l,
                  originalUrl: l.originalUrl || l.url,
                  cropBox: l.cropBox || { left: 0, right: 0, top: 0, bottom: 0 }
                };
              }
              return l;
            });
            setLayers(loadedLayers);
            setHistory([loadedLayers]);
            setHistoryIndex(0);
          } else {
            // Backward compatibility builder: convert legacy config
            const initialLayers = [];
            
            initialLayers.push({
              id: 'background',
              type: 'background',
              name: 'Background Base',
              url: tpl.fileUrl || tpl.previewUrl,
              x: 0,
              y: 0,
              width: tpl.config?.canvasWidth || 1080,
              height: tpl.config?.canvasHeight || 1080,
              rotation: 0,
              opacity: 1,
              startTime: 0,
              endTime: tpl.type === 'video' ? 15 : 0,
              locked: true,
              hidden: false
            });

            if (tpl.config?.photoBox) {
              const pb = tpl.config.photoBox;
              initialLayers.push({
                id: 'user-photo-1',
                type: 'image',
                name: 'Main Photo Frame',
                url: '',
                originalUrl: '',
                cropBox: { left: 0, right: 0, top: 0, bottom: 0 },
                x: pb.x || 100,
                y: pb.y || 100,
                width: pb.width || 250,
                height: pb.height || 250,
                rotation: 0,
                opacity: 1,
                startTime: 0,
                endTime: tpl.type === 'video' ? 15 : 0,
                animation: { type: 'none', duration: 0.5 },
                locked: false,
                hidden: false,
                userEditable: true
              });
            }

            if (tpl.config?.texts) {
              tpl.config.texts.forEach((txt, idx) => {
                initialLayers.push({
                  id: txt.id || `text-${idx}`,
                  type: 'text',
                  name: txt.label || `Text ${idx + 1}`,
                  text: txt.defaultValue || 'Enter text here',
                  x: txt.x || 100,
                  y: txt.y || 400 + (idx * 50),
                  width: 400,
                  height: 80,
                  rotation: 0,
                  opacity: 1,
                  fontFamily: txt.fontFamily || 'Outfit',
                  fontSize: txt.fontSize || 32,
                  color: txt.color || '#FFFFFF',
                  fontWeight: txt.fontWeight || 'bold',
                  align: txt.align || 'left',
                  startTime: 0,
                  endTime: tpl.type === 'video' ? 15 : 0,
                  animation: { type: 'none', duration: 0.5 },
                  locked: false,
                  hidden: false,
                  userEditable: true
                });
              });
            }

            setLayers(initialLayers);
            setHistory([initialLayers]);
            setHistoryIndex(0);
          }
        }
      } catch (err) {
        console.error('Failed to load template:', err);
        setError('Error fetching template configuration.');
      } finally {
        setLoading(false);
      }
    };
    fetchTemplate();
  }, [id]);

  // Check purchase status
  useEffect(() => {
    const checkPurchase = async () => {
      if (!user) return;
      let bypass = (user.role === 'admin' || user.email === 'harry@memoriastudio.com');
      if (bypass) {
        setIsPurchased(true);
        return;
      }
      try {
        const { data } = await API.get('/orders/my-orders');
        if (data.success) {
          const bought = data.data.some(o => o.template?._id === id && o.status === 'paid');
          if (bought) setIsPurchased(true);
        }
      } catch (err) {
        console.error(err);
      }
    };
    checkPurchase();
  }, [id, user]);

  // Dynamic duration calculation: extend timeline if layers end beyond video
  useEffect(() => {
    if (template?.type === 'video') {
      const origVideoDur = videoRef.current?.duration || template.duration || 10;

      // Sum of all insert mode layer durations
      const insertDurations = layers
        .filter(l => (l.type === 'image' || l.type === 'video') && l.playbackMode === 'insert')
        .reduce((sum, l) => sum + (l.endTime - l.startTime), 0);

      const maxLayerEnd = layers.reduce((max, l) => {
        if (l.type === 'background') return max;
        return Math.max(max, l.endTime || 0);
      }, 0);

      const newDuration = Math.max(origVideoDur + insertDurations, maxLayerEnd);
      if (newDuration !== duration) {
        setDuration(newDuration);
        setTrimEnd(newDuration);
      }
    }
  }, [layers, template, videoRef.current?.duration, duration]);

  // Set canvas dimensions ONLY when template changes (not on every frame)
  useEffect(() => {
    if (canvasRef.current && template) {
      canvasRef.current.width = template.config?.canvasWidth || 1080;
      canvasRef.current.height = template.config?.canvasHeight || 1080;
      drawCanvas();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template]);

  // Redraw canvas when layers, language, or time changes while NOT playing
  // During playback, the tick loop handles all drawing
  useEffect(() => {
    if (!isPlaying && canvasRef.current && template) {
      drawCanvas();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layers, currentTime, language]);

  // High-precision preview playback clock using performance.now delta
  useEffect(() => {
    if (!isPlaying) {
      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
      }
      return;
    }

    // Start video playback when Play is pressed
    if (videoRef.current && videoRef.current.paused) {
      const templateTime = getTemplateTime(currentTime);
      const videoDuration = videoRef.current.duration || 10;
      const activeInsert = layersRef.current.some(l =>
        (l.type === 'image' || l.type === 'video') &&
        l.playbackMode === 'insert' &&
        currentTime >= l.startTime &&
        currentTime < l.endTime
      );
      if (templateTime < videoDuration && !activeInsert) {
        videoRef.current.currentTime = templateTime;
        videoRef.current.play().catch(() => {});
      }
    }

    let lastTime = performance.now();
    let animId;
    let wasInsideInsert = false;

    const tick = () => {
      const now = performance.now();
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      let nextTime = currentTimeRef.current + delta;
      if (nextTime >= duration) {
        setIsPlaying(false);
        if (videoRef.current) {
          videoRef.current.pause();
          videoRef.current.currentTime = 0;
        }
        nextTime = 0;
        currentTimeRef.current = 0;
        setCurrentTime(0);
        if (drawCanvasRef.current) {
          drawCanvasRef.current(0);
        }
        return;
      }

      // Sync original video element position
      if (videoRef.current) {
        const templateTime = getTemplateTime(nextTime);
        const videoDuration = videoRef.current.duration || 10;

        // Check if we are currently inside an insert mode layer (use ref for fresh data)
        const isInsideInsert = layersRef.current.some(l =>
          (l.type === 'image' || l.type === 'video') &&
          l.playbackMode === 'insert' &&
          nextTime >= l.startTime &&
          nextTime < l.endTime
        );

        if (!isInsideInsert && templateTime < videoDuration) {
          // We just exited an insert segment, need to seek to correct position
          if (wasInsideInsert) {
            videoRef.current.currentTime = templateTime;
            videoRef.current.play().catch(() => {});
          }
          // Normal playback - let the video play naturally, only correct large drifts
          const currentDrift = Math.abs(videoRef.current.currentTime - templateTime);
          if (videoRef.current.paused || currentDrift > 1.5) {
            videoRef.current.currentTime = templateTime;
            if (videoRef.current.paused) {
              videoRef.current.play().catch(() => {});
            }
          }
          wasInsideInsert = false;
        } else {
          // Inside an insert or video ended - pause the template video
          if (!videoRef.current.paused) {
            videoRef.current.pause();
          }
          videoRef.current.currentTime = Math.min(templateTime, videoDuration);
          wasInsideInsert = isInsideInsert;
        }
      }

      if (audioPreviewRef.current && audioOption === 'replace') {
        const isInsideInsert = layersRef.current.some(l =>
          (l.type === 'image' || l.type === 'video') &&
          l.playbackMode === 'insert' &&
          nextTime >= l.startTime &&
          nextTime < l.endTime
        );
        if (isInsideInsert) {
          if (!audioPreviewRef.current.paused) {
            audioPreviewRef.current.pause();
          }
        } else {
          if (isPlaying) {
            if (audioPreviewRef.current.paused) {
              audioPreviewRef.current.currentTime = Math.max(0, nextTime - trimStart);
              audioPreviewRef.current.play().catch(() => {});
            } else {
              const expectedAudioTime = Math.max(0, nextTime - trimStart);
              if (Math.abs(audioPreviewRef.current.currentTime - expectedAudioTime) > 1.5) {
                audioPreviewRef.current.currentTime = expectedAudioTime;
              }
            }
          }
        }
      }

      currentTimeRef.current = nextTime;
      setCurrentTime(nextTime);
      if (drawCanvasRef.current) {
        drawCanvasRef.current(nextTime);
      }
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, duration, language, layers]);

  // Sync background video position when paused/scrubbing
  useEffect(() => {
    if (!isPlaying && videoRef.current) {
      const templateTime = getTemplateTime(currentTime);
      const videoDuration = videoRef.current.duration || 10;
      if (Math.abs(videoRef.current.currentTime - templateTime) > 0.1) {
        videoRef.current.currentTime = templateTime;
      }
      if (!videoRef.current.paused) {
        videoRef.current.pause();
      }
    }
  }, [isPlaying, currentTime, layers]);

  // Sync playback play/pause and position across custom audio and background music
  // Only trigger on isPlaying changes (not every frame) to prevent audio cracking
  useEffect(() => {
    const audio = audioPreviewRef.current;
    const bgMusic = bgMusicPreviewRef.current;

    if (isPlaying) {
      if (audioOption === 'replace' && audio) {
        audio.currentTime = Math.max(0, currentTime - trimStart);
        audio.play().catch(() => {});
      }
      if (bgMusicUrl && bgMusic) {
        bgMusic.currentTime = currentTime;
        bgMusic.play().catch(() => {});
      }
    } else {
      if (audio && !audio.paused) audio.pause();
      if (bgMusic && !bgMusic.paused) bgMusic.pause();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, audioOption, bgMusicUrl]);

  useEffect(() => {
    if (audioPreviewRef.current) {
      audioPreviewRef.current.volume = customAudioVolume;
    }
  }, [customAudioVolume]);

  useEffect(() => {
    if (bgMusicPreviewRef.current) {
      bgMusicPreviewRef.current.volume = bgMusicVolume;
    }
  }, [bgMusicVolume]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = originalVolume;
    }
  }, [originalVolume]);

  // Draw elements inside canvas context
  // Uses layersRef.current to always read the freshest layers (critical for Insert Mode)
  const drawCanvas = (time = currentTime) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const currentLayers = layersRef.current;

    ctx.clearRect(0, 0, w, h);

    const sorted = [...currentLayers].sort((a, b) => {
      const idxA = currentLayers.indexOf(a);
      const idxB = currentLayers.indexOf(b);
      return idxA - idxB;
    });

    sorted.forEach(layer => {
      // Manage layer visibility and video layer playback state
      const isVisible = !layer.hidden && 
        !(template?.type === 'video' && layer.type !== 'background' && 
          (time < layer.startTime || (layer.endTime > 0 && time > layer.endTime)));

      if (layer.type === 'video') {
        if (layer.videoObj && (!isVisible || !isPlaying)) {
          if (!layer.videoObj.paused) {
            try { layer.videoObj.pause(); } catch (e) {}
          }
        }
        if (layer.audioObj && (!isVisible || !isPlaying || layer.audioOption !== 'replace')) {
          if (!layer.audioObj.paused) {
            try { layer.audioObj.pause(); } catch (e) {}
          }
        }
      } else if (layer.type === 'image' || layer.type === 'symbol') {
        if (layer.audioObj && (!isVisible || !isPlaying || layer.audioOption !== 'replace')) {
          if (!layer.audioObj.paused) {
            try { layer.audioObj.pause(); } catch (e) {}
          }
        }
      }

      if (!isVisible) return;

      ctx.save();

      let animOpacity = layer.opacity !== undefined ? layer.opacity : 1.0;
      let animScale = 1.0;
      let animOffsetX = 0;
      let animOffsetY = 0;

      if (template?.type === 'video' && layer.animation && layer.animation.type !== 'none') {
        const anim = layer.animation;
        const elapsed = time - layer.startTime;
        const dur = anim.duration || 0.5;

        if (elapsed < dur) {
          const tVal = elapsed / dur;
          if (anim.type === 'fade') {
            animOpacity = tVal * animOpacity;
          } else if (anim.type === 'zoom') {
            animScale = tVal;
          } else if (anim.type === 'slide-left') {
            animOffsetX = (1 - tVal) * -150;
          } else if (anim.type === 'slide-right') {
            animOffsetX = (1 - tVal) * 150;
          } else if (anim.type === 'bounce') {
            animScale = 1 + Math.sin(tVal * Math.PI) * 0.15;
          }
        }
      }

      ctx.translate(layer.x + layer.width / 2 + animOffsetX, layer.y + layer.height / 2 + animOffsetY);
      ctx.rotate((layer.rotation * Math.PI) / 180);
      ctx.scale(animScale, animScale);
      ctx.globalAlpha = animOpacity;

      if (layer.type === 'background') {
        const activeInsert = currentLayers.some(l => 
          (l.type === 'image' || l.type === 'video') && 
          l.playbackMode === 'insert' && 
          time >= l.startTime && 
          time < l.endTime
        );

        if (activeInsert) {
          // Draw solid black background instead of template during sequential insert
          ctx.fillStyle = '#000000';
          ctx.fillRect(-layer.width / 2, -layer.height / 2, layer.width, layer.height);
        } else if (template?.type === 'video' && videoRef.current) {
          try {
            // When paused/scrubbing, seek to exact frame; when playing, let video play naturally
            if (!isPlaying) {
              const templateTime = getTemplateTime(time);
              if (Math.abs(videoRef.current.currentTime - templateTime) > 0.1) {
                videoRef.current.currentTime = templateTime;
              }
            }
            ctx.drawImage(videoRef.current, -layer.width / 2, -layer.height / 2, layer.width, layer.height);
          } catch (e) {
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(-layer.width / 2, -layer.height / 2, layer.width, layer.height);
          }
        } else if (layer.imageObj && (layer.imageObj instanceof HTMLImageElement || layer.imageObj.tagName === 'IMG')) {
          ctx.drawImage(layer.imageObj, -layer.width / 2, -layer.height / 2, layer.width, layer.height);
        } else {
          ctx.fillStyle = '#0a0f1d';
          ctx.fillRect(-layer.width / 2, -layer.height / 2, layer.width, layer.height);
        }
      } else if (layer.type === 'text') {
        drawText(ctx, layer);
      } else if ((layer.type === 'image' || layer.type === 'symbol') && layer.imageObj && (layer.imageObj instanceof HTMLImageElement || layer.imageObj.tagName === 'IMG')) {
        // Sync attached audio for image layers
        const audio = layer.audioObj;
        if (audio) {
          const elapsed = time - layer.startTime;
          const trimS = layer.audioTrimStart || 0;
          const playTime = elapsed + trimS;

          audio.volume = layer.volume !== undefined ? layer.volume : 1.0;
          if (isVisible && isPlaying && layer.audioOption === 'replace') {
            if (audio.paused) {
              audio.currentTime = playTime;
              audio.play().catch(() => {});
            } else {
              if (Math.abs(audio.currentTime - playTime) > 1.5) {
                audio.currentTime = playTime;
              }
            }
          } else {
            if (!audio.paused) {
              try { audio.pause(); } catch (e) {}
            }
            if (isVisible && !isPlaying && layer.audioOption === 'replace') {
              if (Math.abs(audio.currentTime - playTime) > 0.05) {
                audio.currentTime = playTime;
              }
            }
          }
        }

        if (layer.flipH || layer.flipV) {
          ctx.scale(layer.flipH ? -1 : 1, layer.flipV ? -1 : 1);
        }
        ctx.drawImage(layer.imageObj, -layer.width / 2, -layer.height / 2, layer.width, layer.height);
      } else if (layer.type === 'video' && layer.videoObj) {
        const video = layer.videoObj;
        const elapsed = time - layer.startTime;
        const trimS = layer.audioTrimStart || 0;
        const trimE = layer.audioTrimEnd || (video.duration || 5);
        const playTime = elapsed + trimS;
        const inRange = elapsed >= 0 && playTime <= trimE;

        // Apply audio settings for original audio
        const isMuted = layer.audioOption === 'mute' || layer.audioOption === 'replace';
        video.muted = isMuted;
        video.volume = layer.volume !== undefined ? layer.volume : 1.0;

        if (inRange) {
          try {
            const driftLimit = isPlaying ? 1.5 : 0.05;
            if (Math.abs(video.currentTime - playTime) > driftLimit) {
              video.currentTime = playTime;
            }
            if (isPlaying && video.paused) {
              video.play().catch(() => {});
            } else if (!isPlaying && !video.paused) {
              video.pause();
            }
          } catch (e) {}
        } else {
          if (!video.paused) {
            try { video.pause(); } catch (e) {}
          }
        }

        // Custom audio replacement handling
        const audio = layer.audioObj;
        if (audio) {
          audio.volume = layer.volume !== undefined ? layer.volume : 1.0;
          if (isVisible && isPlaying && layer.audioOption === 'replace') {
            if (audio.paused) {
              audio.currentTime = playTime;
              audio.play().catch(() => {});
            } else {
              if (Math.abs(audio.currentTime - playTime) > 1.5) {
                audio.currentTime = playTime;
              }
            }
          } else {
            if (!audio.paused) {
              try { audio.pause(); } catch (e) {}
            }
            if (isVisible && !isPlaying && layer.audioOption === 'replace') {
              if (Math.abs(audio.currentTime - playTime) > 0.05) {
                audio.currentTime = playTime;
              }
            }
          }
        }

        if (layer.flipH || layer.flipV) {
          ctx.scale(layer.flipH ? -1 : 1, layer.flipV ? -1 : 1);
        }
        try {
          ctx.drawImage(video, -layer.width / 2, -layer.height / 2, layer.width, layer.height);
        } catch (e) {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(-layer.width / 2, -layer.height / 2, layer.width, layer.height);
        }
      } else if (layer.type === 'image') {
        ctx.fillStyle = 'rgba(99, 102, 241, 0.15)';
        ctx.fillRect(-layer.width / 2, -layer.height / 2, layer.width, layer.height);
        ctx.strokeStyle = 'var(--primary)';
        ctx.lineWidth = 2;
        ctx.strokeRect(-layer.width / 2, -layer.height / 2, layer.width, layer.height);
        ctx.fillStyle = '#ffffff';
        ctx.font = '24px Outfit';
        ctx.textAlign = 'center';
        ctx.fillText('Double Click to Upload', 0, 0);
      } else if (layer.type === 'shape') {
        ctx.fillStyle = layer.color || 'var(--primary)';
        ctx.fillRect(-layer.width / 2, -layer.height / 2, layer.width, layer.height);
      }

      ctx.restore();
    });
  };
  drawCanvasRef.current = drawCanvas;

  // Draw Text Layer details
  const drawText = (ctx, layer) => {
    ctx.font = `${layer.fontStyle || 'normal'} ${layer.fontWeight || 'normal'} ${layer.fontSize}px ${layer.fontFamily || 'Outfit'}`;
    ctx.textAlign = layer.align || 'center';
    ctx.textBaseline = 'middle';

    if (ctx.letterSpacing !== undefined) {
      ctx.letterSpacing = `${layer.letterSpacing || 0}px`;
    }

    if (layer.gradientColors && layer.gradientColors.length >= 2) {
      const grad = ctx.createLinearGradient(-layer.width / 2, 0, layer.width / 2, 0);
      layer.gradientColors.forEach((col, index) => {
        grad.addColorStop(index / (layer.gradientColors.length - 1), col);
      });
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = layer.color || '#ffffff';
    }

    if (layer.shadowColor && layer.shadowBlur) {
      ctx.shadowColor = layer.shadowColor;
      ctx.shadowBlur = layer.shadowBlur;
      ctx.shadowOffsetX = 3;
      ctx.shadowOffsetY = 3;
    } else {
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }

    if (layer.outlineColor && layer.outlineWidth) {
      ctx.strokeStyle = layer.outlineColor;
      ctx.lineWidth = layer.outlineWidth;
    }

    const displayText = language === 'te' ? translateToTelugu(layer.text || '') : (layer.text || '');
    const words = displayText.split(' ');
    const lines = [];
    let currentLine = '';

    for (let n = 0; n < words.length; n++) {
      const testLine = currentLine + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > layer.width && n > 0) {
        lines.push(currentLine);
        currentLine = words[n] + ' ';
      } else {
        currentLine = testLine;
      }
    }
    lines.push(currentLine);

    const lineSpacing = layer.lineSpacing || 1.2;
    const totalH = lines.length * layer.fontSize * lineSpacing;
    let startY = -totalH / 2 + layer.fontSize / 2;

    lines.forEach(line => {
      const textX = layer.align === 'left' ? -layer.width / 2 : (layer.align === 'right' ? layer.width / 2 : 0);
      if (layer.outlineColor && layer.outlineWidth) {
        ctx.strokeText(line.trim(), textX, startY);
      }
      ctx.fillText(line.trim(), textX, startY);
      startY += layer.fontSize * lineSpacing;
    });
  };

  // Drag and drop handlers
  const handleDragStart = (e, layer) => {
    if (layer.locked) return;
    if (!isAdmin() && layer.userEditable === false) return;
    e.stopPropagation();
    setActiveLayerId(layer.id);

    const isTouch = e.type.startsWith('touch');
    const startX = isTouch ? e.touches[0].clientX : e.clientX;
    const startY = isTouch ? e.touches[0].clientY : e.clientY;
    const initX = layer.x;
    const initY = layer.y;

    const handleMouseMove = (moveEvent) => {
      const isMoveTouch = moveEvent.type.startsWith('touch');
      const currentX = isMoveTouch ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const currentY = isMoveTouch ? moveEvent.touches[0].clientY : moveEvent.clientY;
      const dx = (currentX - startX) / zoomScale;
      const dy = (currentY - startY) / zoomScale;
      updateLayerProperties(layer.id, { x: initX + dx, y: initY + dy });
    };

    const handleMouseUp = () => {
      if (isTouch) {
        window.removeEventListener('touchmove', handleMouseMove);
        window.removeEventListener('touchend', handleMouseUp);
      } else {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      }
      saveStateToHistory();
    };

    if (isTouch) {
      window.addEventListener('touchmove', handleMouseMove, { passive: false });
      window.addEventListener('touchend', handleMouseUp);
    } else {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
  };

  // Corner resizing handler
  const handleResizeStart = (e, layer) => {
    if (layer.locked) return;
    e.stopPropagation();

    const isTouch = e.type.startsWith('touch');
    const startX = isTouch ? e.touches[0].clientX : e.clientX;
    const startY = isTouch ? e.touches[0].clientY : e.clientY;
    const initW = layer.width;
    const initH = layer.height;

    const handleMouseMove = (moveEvent) => {
      const isMoveTouch = moveEvent.type.startsWith('touch');
      const currentX = isMoveTouch ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const currentY = isMoveTouch ? moveEvent.touches[0].clientY : moveEvent.clientY;
      const dw = (currentX - startX) / zoomScale;
      const dh = (currentY - startY) / zoomScale;
      updateLayerProperties(layer.id, {
        width: Math.max(30, initW + dw),
        height: Math.max(30, initH + dh)
      });
    };

    const handleMouseUp = () => {
      if (isTouch) {
        window.removeEventListener('touchmove', handleMouseMove);
        window.removeEventListener('touchend', handleMouseUp);
      } else {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      }
      saveStateToHistory();
    };

    if (isTouch) {
      window.addEventListener('touchmove', handleMouseMove, { passive: false });
      window.addEventListener('touchend', handleMouseUp);
    } else {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
  };

  // Rotation handler
  const handleRotateStart = (e, layer) => {
    if (layer.locked) return;
    e.stopPropagation();

    const element = document.getElementById(`layer-wrapper-${layer.id}`);
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const isTouch = e.type.startsWith('touch');

    const handleMouseMove = (moveEvent) => {
      const isMoveTouch = moveEvent.type.startsWith('touch');
      const currentX = isMoveTouch ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const currentY = isMoveTouch ? moveEvent.touches[0].clientY : moveEvent.clientY;
      const angle = Math.atan2(currentY - centerY, currentX - centerX);
      let deg = (angle * 180) / Math.PI - 90;
      updateLayerProperties(layer.id, { rotation: Math.round(deg) });
    };

    const handleMouseUp = () => {
      if (isTouch) {
        window.removeEventListener('touchmove', handleMouseMove);
        window.removeEventListener('touchend', handleMouseUp);
      } else {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      }
      saveStateToHistory();
    };

    if (isTouch) {
      window.addEventListener('touchmove', handleMouseMove, { passive: false });
      window.addEventListener('touchend', handleMouseUp);
    } else {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
  };

  // ============================================================
  //  Mobile Pointer-based Gesture System
  //  Provides: single-finger drag, two-finger pinch-to-zoom,
  //  two-finger rotation. Uses Pointer Capture for smooth tracking.
  //  Desktop mouse behaviour is completely unchanged (handled above).
  // ============================================================
  const gestureBaseRef = useRef(null);

  const handleLayerPointerDown = (e, layer) => {
    // Only handle touch pointers — mouse uses existing handlers
    if (e.pointerType !== 'touch') return;
    
    // Safety guard: Do not intercept taps on toolbar/action buttons, inputs, tabs, header or menu lists
    if (e.target.closest('button, input, select, textarea, a, [role="button"], .layer-actions, .editor-tab-panel, .editor-left-tabs, .editor-header, .context-menu')) {
      return;
    }

    if (layer.locked) return;
    if (!isAdmin() && layer.userEditable === false) return;

    // Custom Double-tap detection for mobile/tablet to focus the hidden direct editor input
    const now = Date.now();
    const doubleTapThreshold = 300; // ms
    if (lastTapRef.current.layerId === layer.id && now - lastTapRef.current.time < doubleTapThreshold) {
      e.preventDefault();
      e.stopPropagation();
      setActiveLayerId(layer.id);
      
      // Focus direct text editor input
      if (layer.type === 'text') {
        focusCanvasMobileTextInput();
      }
      
      lastTapRef.current = { time: 0, layerId: null };
      return;
    }
    lastTapRef.current = { time: now, layerId: layer.id };

    e.preventDefault();
    e.stopPropagation();
    setActiveLayerId(layer.id);

    const pointers = activePointersRef.current;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Capture pointer for smooth off-element tracking
    try { e.target.setPointerCapture(e.pointerId); } catch (_) {}

    if (pointers.size === 1) {
      // Single finger: init drag
      gestureBaseRef.current = {
        mode: 'drag',
        startX: e.clientX,
        startY: e.clientY,
        initX: layer.x,
        initY: layer.y,
        layerId: layer.id
      };
    } else if (pointers.size === 2) {
      // Two fingers: init pinch/rotate
      const pts = Array.from(pointers.values());
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      const angle = Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x);
      gestureBaseRef.current = {
        mode: 'pinch',
        baseDist: dist,
        baseAngle: angle,
        initWidth: layer.width,
        initHeight: layer.height,
        initRotation: layer.rotation || 0,
        layerId: layer.id
      };
    }
  };

  const handleLayerPointerMove = (e) => {
    if (e.pointerType !== 'touch') return;
    
    // Safety guard: Do not intercept pointer events on UI buttons and controls
    if (e.target.closest('button, input, select, textarea, a, [role="button"], .layer-actions, .editor-tab-panel, .editor-left-tabs, .editor-header, .context-menu')) {
      return;
    }
    
    e.preventDefault();

    const pointers = activePointersRef.current;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const base = gestureBaseRef.current;
    if (!base) return;

    if (base.mode === 'drag' && pointers.size === 1) {
      const dx = (e.clientX - base.startX) / zoomScale;
      const dy = (e.clientY - base.startY) / zoomScale;
      updateLayerProperties(base.layerId, { x: base.initX + dx, y: base.initY + dy });
    } else if (base.mode === 'pinch' && pointers.size === 2) {
      const pts = Array.from(pointers.values());
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      const angle = Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x);
      const scale = dist / base.baseDist;
      const angleDeg = ((angle - base.baseAngle) * 180) / Math.PI;
      updateLayerProperties(base.layerId, {
        width: Math.max(30, Math.round(base.initWidth * scale)),
        height: Math.max(30, Math.round(base.initHeight * scale)),
        rotation: Math.round(base.initRotation + angleDeg)
      });
    }
  };

  const handleLayerPointerUp = (e) => {
    if (e.pointerType !== 'touch') return;
    
    // Safety guard: Do not intercept pointer events on UI buttons and controls
    if (e.target.closest('button, input, select, textarea, a, [role="button"], .layer-actions, .editor-tab-panel, .editor-left-tabs, .editor-header, .context-menu')) {
      return;
    }

    const pointers = activePointersRef.current;
    pointers.delete(e.pointerId);

    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }

    if (pointers.size === 0) {
      gestureBaseRef.current = null;
      saveStateToHistory();
    } else if (pointers.size === 1 && gestureBaseRef.current) {
      // Went from 2 fingers → 1 finger: recalculate drag baseline
      const remaining = Array.from(pointers.values())[0];
      const layer = layers.find(l => l.id === gestureBaseRef.current.layerId);
      if (layer) {
        gestureBaseRef.current = {
          mode: 'drag',
          startX: remaining.x,
          startY: remaining.y,
          initX: layer.x,
          initY: layer.y,
          layerId: layer.id
        };
      }
    }
  };

  // Pointer handlers for resize handle (touch only)
  const handleResizePointerDown = (e, layer) => {
    if (e.pointerType !== 'touch') return;
    if (layer.locked) return;
    
    // Safety guard: Do not intercept pointer events on UI buttons and controls
    if (e.target.closest('button, input, select, textarea, a, [role="button"], .layer-actions, .editor-tab-panel, .editor-left-tabs, .editor-header, .context-menu')) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    try { e.target.setPointerCapture(e.pointerId); } catch (_) {}

    const startX = e.clientX;
    const startY = e.clientY;
    const initW = layer.width;
    const initH = layer.height;

    const onMove = (me) => {
      me.preventDefault();
      const dw = (me.clientX - startX) / zoomScale;
      const dh = (me.clientY - startY) / zoomScale;
      updateLayerProperties(layer.id, {
        width: Math.max(30, initW + dw),
        height: Math.max(30, initH + dh)
      });
    };

    const onUp = (upEvent) => {
      // Release pointer capture correctly
      try {
        upEvent.target.releasePointerCapture(upEvent.pointerId);
      } catch (_) {}

      e.target.removeEventListener('pointermove', onMove);
      e.target.removeEventListener('pointerup', onUp);
      e.target.removeEventListener('pointercancel', onUp);

      // Clean up active pointer records and reset gesture base state
      activePointersRef.current.delete(upEvent.pointerId);
      activePointersRef.current.clear(); // Safe fallback reset
      gestureBaseRef.current = null;

      if (touchTimerRef.current) {
        clearTimeout(touchTimerRef.current);
        touchTimerRef.current = null;
      }

      saveStateToHistory();
    };

    e.target.addEventListener('pointermove', onMove);
    e.target.addEventListener('pointerup', onUp);
    e.target.addEventListener('pointercancel', onUp);
  };

  // Pointer handlers for rotate handle (touch only)
  const handleRotatePointerDown = (e, layer) => {
    if (e.pointerType !== 'touch') return;
    if (layer.locked) return;
    
    // Safety guard: Do not intercept pointer events on UI buttons and controls
    if (e.target.closest('button, input, select, textarea, a, [role="button"], .layer-actions, .editor-tab-panel, .editor-left-tabs, .editor-header, .context-menu')) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    try { e.target.setPointerCapture(e.pointerId); } catch (_) {}

    const element = document.getElementById(`layer-wrapper-${layer.id}`);
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const onMove = (me) => {
      me.preventDefault();
      const angle = Math.atan2(me.clientY - centerY, me.clientX - centerX);
      let deg = (angle * 180) / Math.PI - 90;
      updateLayerProperties(layer.id, { rotation: Math.round(deg) });
    };

    const onUp = (upEvent) => {
      // Release pointer capture correctly
      try {
        upEvent.target.releasePointerCapture(upEvent.pointerId);
      } catch (_) {}

      e.target.removeEventListener('pointermove', onMove);
      e.target.removeEventListener('pointerup', onUp);
      e.target.removeEventListener('pointercancel', onUp);

      // Clean up active pointer records and reset gesture base state
      activePointersRef.current.delete(upEvent.pointerId);
      activePointersRef.current.clear(); // Safe fallback reset
      gestureBaseRef.current = null;

      if (touchTimerRef.current) {
        clearTimeout(touchTimerRef.current);
        touchTimerRef.current = null;
      }

      saveStateToHistory();
    };

    e.target.addEventListener('pointermove', onMove);
    e.target.addEventListener('pointerup', onUp);
    e.target.addEventListener('pointercancel', onUp);
  };

  // History logic (Undo/Redo)
  const saveStateToHistory = (customLayers = layers) => {
    const updatedHistory = history.slice(0, historyIndex + 1);
    
    // Deep clone parameters but preserve HTML Image elements references
    const clonedLayers = customLayers.map(l => {
      const { imageObj, ...rest } = l;
      const cloned = JSON.parse(JSON.stringify(rest));
      if (imageObj) {
        cloned.imageObj = imageObj;
      }
      return cloned;
    });

    updatedHistory.push(clonedLayers);
    setHistory(updatedHistory);
    setHistoryIndex(updatedHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const targetIndex = historyIndex - 1;
      setLayers(history[targetIndex]);
      setHistoryIndex(targetIndex);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const targetIndex = historyIndex + 1;
      setLayers(history[targetIndex]);
      setHistoryIndex(targetIndex);
    }
  };

  // Update properties of a layer
  const updateLayerProperties = (layerId, props) => {
    setLayers(prev => prev.map(l => l.id === layerId ? { ...l, ...props } : l));
  };

  // Add custom elements
  const addTextLayer = () => {
    const newL = {
      id: `text-${Date.now()}`,
      type: 'text',
      name: 'New Text Box',
      text: 'Double click to edit',
      x: 150,
      y: 150,
      width: 400,
      height: 80,
      rotation: 0,
      opacity: 1,
      fontFamily: 'Outfit',
      fontSize: 36,
      color: '#ffffff',
      fontWeight: 'bold',
      align: 'center',
      startTime: 0,
      endTime: template?.type === 'video' ? duration : 0,
      animation: { type: 'none', duration: 0.5 },
      locked: false,
      hidden: false,
      userEditable: true
    };
    const updated = [...layers, newL];
    setLayers(updated);
    setActiveLayerId(newL.id);
    setActiveTab('text');
    saveStateToHistory(updated);
  };

  const addShapeLayer = () => {
    const newL = {
      id: `shape-${Date.now()}`,
      type: 'shape',
      name: 'Rectangle Shape',
      x: 200,
      y: 200,
      width: 150,
      height: 150,
      color: 'rgba(99, 102, 241, 0.7)',
      rotation: 0,
      opacity: 0.8,
      startTime: 0,
      endTime: template?.type === 'video' ? duration : 0,
      animation: { type: 'none', duration: 0.5 },
      locked: false,
      hidden: false,
      userEditable: true
    };
    const updated = [...layers, newL];
    setLayers(updated);
    saveStateToHistory(updated);
  };

  // Duplicate layer
  const duplicateLayer = (layerId) => {
    const layer = layers.find(l => l.id === layerId);
    if (!layer || layer.type === 'background') return;
    const duplicated = {
      ...JSON.parse(JSON.stringify(layer)),
      id: `${layer.type}-${Date.now()}`,
      name: `${layer.name} (Copy)`,
      x: layer.x + 30,
      y: layer.y + 30
    };
    const updated = [...layers, duplicated];
    setLayers(updated);
    saveStateToHistory(updated);
  };

  // Delete layer
  const deleteLayer = (layerId) => {
    const layer = layers.find(l => l.id === layerId);
    if (!layer || layer.type === 'background') return;
    const updated = layers.filter(l => l.id !== layerId);
    setLayers(updated);
    if (activeLayerId === layerId) setActiveLayerId(null);
    saveStateToHistory(updated);
  };

  // Remove Photo (reset content back to empty placeholder)
  const handleRemovePhoto = (layerId) => {
    const confirmRemove = window.confirm(language === 'en' ? 'Are you sure you want to remove the photo from this placeholder?' : 'మీరు ఈ ప్లేస్‌హోల్డర్ నుండి ఫోటోను తీసివేయాలనుకుంటున్నారా?');
    if (!confirmRemove) return;

    updateLayerProperties(layerId, {
      url: null,
      originalUrl: null,
      imageObj: null,
      cropBox: { left: 0, right: 0, top: 0, bottom: 0 },
      cropZoom: 1.0,
      cropRotation: 0,
      cropFlipH: false,
      cropFlipV: false,
      cropOffsetX: 0,
      cropOffsetY: 0,
      cropAspectRatio: 'Free'
    });
    saveStateToHistory();
  };

  // Trigger click on hidden file input to replace photo
  const triggerReplacePhoto = (layerId) => {
    setActiveLayerId(layerId);
    const fileInput = document.getElementById('user-photo-upload');
    if (fileInput) {
      fileInput.click();
    }
  };

  // Right-click context menu positioning
  const handleContextMenu = (e, layerId) => {
    e.preventDefault();
    const layer = layers.find(l => l.id === layerId);
    if (!layer || layer.type === 'background') return;

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      layerId: layer.id
    });
  };

  // Deletion Keyboard Shortcuts (Delete/Backspace)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA' || document.activeElement.isContentEditable) {
        return;
      }
      
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (activeLayerId) {
          const layer = layers.find(l => l.id === activeLayerId);
          if (layer && layer.type !== 'background') {
            deleteLayer(activeLayerId);
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeLayerId, layers, language]);

  // Global click event to close context menu
  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  // Layers order manipulation
  const adjustLayerOrder = (layerId, direction) => {
    const index = layers.findIndex(l => l.id === layerId);
    if (index === -1) return;
    const updated = [...layers];
    if (direction === 'forward' && index < layers.length - 1) {
      const temp = updated[index];
      updated[index] = updated[index + 1];
      updated[index + 1] = temp;
    } else if (direction === 'backward' && index > 0) {
      if (updated[index - 1].type === 'background') return;
      const temp = updated[index];
      updated[index] = updated[index - 1];
      updated[index - 1] = temp;
    }
    setLayers(updated);
    saveStateToHistory(updated);
  };

  const bringToFront = (layerId) => {
    const index = layers.findIndex(l => l.id === layerId);
    if (index === -1 || index === layers.length - 1) return;
    const updated = [...layers];
    const layer = updated.splice(index, 1)[0];
    updated.push(layer);
    setLayers(updated);
    saveStateToHistory(updated);
  };

  const sendToBack = (layerId) => {
    const index = layers.findIndex(l => l.id === layerId);
    if (index === -1) return;
    const updated = [...layers];
    const layer = updated.splice(index, 1)[0];
    const targetIndex = updated.length > 0 && updated[0].type === 'background' ? 1 : 0;
    if (index === targetIndex) return; // Already at the bottom
    updated.splice(targetIndex, 0, layer);
    setLayers(updated);
    saveStateToHistory(updated);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';

    // Reset all file inputs to allow consecutive uploads of the same file/type
    const fileInputs = document.querySelectorAll('input[type="file"]');
    fileInputs.forEach(input => {
      input.value = '';
    });

    const fileUrl = URL.createObjectURL(file);
    setUploadGallery(prev => [...prev, { id: `upload-${Date.now()}-${Math.round(Math.random() * 1e5)}`, url: fileUrl }]);
    const isVideo = file.type.startsWith('video/');
    const isReplacing = e.target.id === 'user-photo-upload' && activeLayer && (activeLayer.type === 'image' || activeLayer.type === 'video' || activeLayer.type === 'symbol');

    if (isVideo) {
      const videoObj = document.createElement('video');
      videoObj.src = fileUrl;
      videoObj.crossOrigin = 'anonymous';
      videoObj.muted = true;
      videoObj.playsInline = true;
      videoObj.onloadedmetadata = () => {
        if (isReplacing) {
          updateLayerProperties(activeLayerId, {
            type: 'video',
            url: fileUrl,
            originalUrl: fileUrl,
            videoObj: videoObj,
            imageObj: null,
            name: `Uploaded Video`,
            file: file,
            audioOption: 'keep',
            volume: 1.0,
            customAudioUrl: '',
            audioTrimStart: 0,
            audioTrimEnd: videoObj.duration || 5,
            cropBox: { left: 0, right: 0, top: 0, bottom: 0 }
          });
          saveStateToHistory();
        } else {
          const newL = {
            id: `video-${Date.now()}`,
            type: 'video',
            name: `Video ${layers.filter(l => l.type === 'video').length + 1}`,
            url: fileUrl,
            originalUrl: fileUrl,
            videoObj: videoObj,
            file: file,
            x: 150,
            y: 150,
            width: 320,
            height: 240,
            rotation: 0,
            opacity: 1,
            startTime: currentTime,
            endTime: Math.min(currentTime + (videoObj.duration || 5), duration),
            animation: { type: 'none', duration: 0.5 },
            locked: false,
            hidden: false,
            userEditable: true,
            audioOption: 'keep',
            volume: 1.0,
            customAudioUrl: '',
            audioTrimStart: 0,
            audioTrimEnd: videoObj.duration || 5
          };
          const updated = [...layers, newL];
          setLayers(updated);
          setActiveLayerId(newL.id);
          saveStateToHistory(updated);
        }
      };
    } else {
      const img = new Image();
      img.src = fileUrl;
      img.onload = () => {
        if (isReplacing) {
          updateLayerProperties(activeLayerId, {
            type: 'image',
            url: fileUrl,
            originalUrl: fileUrl,
            imageObj: img,
            videoObj: null,
            file: file,
            cropBox: { left: 0, right: 0, top: 0, bottom: 0 }
          });
          saveStateToHistory();
        } else {
          const newL = {
            id: `image-${Date.now()}`,
            type: 'image',
            name: `Photo ${layers.filter(l => l.type === 'image').length + 1}`,
            url: fileUrl,
            originalUrl: fileUrl,
            imageObj: img,
            file: file,
            x: 200,
            y: 200,
            width: 250,
            height: 250,
            rotation: 0,
            opacity: 1,
            startTime: currentTime,
            endTime: Math.min(currentTime + 5, duration),
            animation: { type: 'none', duration: 0.5 },
            locked: false,
            hidden: false,
            userEditable: true
          };
          const updated = [...layers, newL];
          setLayers(updated);
          setActiveLayerId(newL.id);
          saveStateToHistory(updated);
        }
      };
    }
  };

  // Drag track bar horizontally to move layer duration block
  const handleTrackDragStart = (e, layer) => {
    e.stopPropagation();
    const trackBarContainer = e.currentTarget.parentElement;
    const rect = trackBarContainer.getBoundingClientRect();
    const startX = e.clientX;
    const initStart = layer.startTime;
    const initEnd = layer.endTime;
    const blockDuration = initEnd - initStart;

    const origDur = template?.type === 'video' && videoRef.current?.duration ? videoRef.current.duration : 10;
    const currentTimelineScale = Math.max(duration, origDur + 10, 30);

    const handleMouseMove = (moveEvent) => {
      const dx = ((moveEvent.clientX - startX) / rect.width) * currentTimelineScale;
      let newStart = initStart + dx;
      let newEnd = newStart + blockDuration;

      // Snapping thresholds (0.3 seconds)
      const snapThreshold = 0.3;
      
      // 1. Snap to beginning (0s)
      if (Math.abs(newStart) < snapThreshold) {
        newStart = 0;
        newEnd = blockDuration;
      }
      
      // 2. Snap to playhead (currentTime)
      if (Math.abs(newStart - currentTime) < snapThreshold) {
        newStart = currentTime;
        newEnd = newStart + blockDuration;
      }
      if (Math.abs(newEnd - currentTime) < snapThreshold) {
        newEnd = currentTime;
        newStart = newEnd - blockDuration;
      }

      // 3. Snap to composition end (duration)
      if (Math.abs(newEnd - duration) < snapThreshold) {
        newEnd = duration;
        newStart = newEnd - blockDuration;
      }

      // 4. Snap to nearby layers boundaries
      layers.forEach(other => {
        if (other.id === layer.id || other.type === 'background') return;
        if (Math.abs(newStart - other.endTime) < snapThreshold) {
          newStart = other.endTime;
          newEnd = newStart + blockDuration;
        }
        if (Math.abs(newEnd - other.startTime) < snapThreshold) {
          newEnd = other.startTime;
          newStart = newEnd - blockDuration;
        }
      });

      // Keep within bounds
      if (newStart < 0) {
        newStart = 0;
        newEnd = blockDuration;
      }

      updateLayerProperties(layer.id, { startTime: newStart, endTime: newEnd });
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      saveStateToHistory();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Resize/trim timeline layer from the left/start edge
  const handleTrackResizeLeftStart = (e, layer) => {
    e.stopPropagation();
    const trackBarContainer = e.currentTarget.parentElement.parentElement;
    const rect = trackBarContainer.getBoundingClientRect();
    const startX = e.clientX;
    const initStart = layer.startTime;
    const initEnd = layer.endTime;

    const origDur = template?.type === 'video' && videoRef.current?.duration ? videoRef.current.duration : 10;
    const currentTimelineScale = Math.max(duration, origDur + 10, 30);

    const handleMouseMove = (moveEvent) => {
      const dx = ((moveEvent.clientX - startX) / rect.width) * currentTimelineScale;
      let newStart = Math.max(0, Math.min(initStart + dx, initEnd - 0.5));

      // Snapping left boundary
      const snapThreshold = 0.3;
      if (Math.abs(newStart - currentTime) < snapThreshold) {
        newStart = currentTime;
      }
      layers.forEach(other => {
        if (other.id === layer.id || other.type === 'background') return;
        if (Math.abs(newStart - other.endTime) < snapThreshold) {
          newStart = other.endTime;
        }
      });

      updateLayerProperties(layer.id, { startTime: newStart });
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      saveStateToHistory();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Resize/trim timeline layer from the right/end edge
  const handleTrackResizeRightStart = (e, layer) => {
    e.stopPropagation();
    const trackBarContainer = e.currentTarget.parentElement.parentElement;
    const rect = trackBarContainer.getBoundingClientRect();
    const startX = e.clientX;
    const initStart = layer.startTime;
    const initEnd = layer.endTime;

    const origDur = template?.type === 'video' && videoRef.current?.duration ? videoRef.current.duration : 10;
    const currentTimelineScale = Math.max(duration, origDur + 10, 30);

    const handleMouseMove = (moveEvent) => {
      const dx = ((moveEvent.clientX - startX) / rect.width) * currentTimelineScale;
      let newEnd = Math.max(initStart + 0.5, initEnd + dx);

      // Snapping right boundary
      const snapThreshold = 0.3;
      if (Math.abs(newEnd - currentTime) < snapThreshold) {
        newEnd = currentTime;
      }
      layers.forEach(other => {
        if (other.id === layer.id || other.type === 'background') return;
        if (Math.abs(newEnd - other.startTime) < snapThreshold) {
          newEnd = other.startTime;
        }
      });

      updateLayerProperties(layer.id, { endTime: newEnd });
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      saveStateToHistory();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Handle Preset Symbol clicks
  const selectPresetSymbol = (url, name, category) => {
    let width = 120;
    let height = 120;
    let x = 300;
    let y = 300;

    if (category === 'ribbons') {
      width = 400;
      height = 70;
      x = 340;
      y = 800;
    } else if (category === 'nameplates') {
      width = 300;
      height = 75;
      x = 390;
      y = 700;
    } else if (category === 'borders') {
      width = 600;
      height = 600;
      x = 240;
      y = 240;
    }

    const newL = {
      id: `symbol-${Date.now()}`,
      type: 'symbol',
      name: name || 'Symbol Logo',
      url: url,
      originalUrl: url,
      cropBox: { left: 0, right: 0, top: 0, bottom: 0 },
      x: x,
      y: y,
      width: width,
      height: height,
      rotation: 0,
      opacity: 1,
      startTime: 0,
      endTime: template?.type === 'video' ? duration : 0,
      animation: { type: 'none', duration: 0.5 },
      locked: false,
      hidden: false,
      userEditable: true
    };
    const updated = [...layers, newL];
    setLayers(updated);
    saveStateToHistory(updated);
  };

  // Subject cutout auto crop estimation algorithm
  const handleAutoCrop = (imgElement) => {
    if (!imgElement) return;

    const maxDimension = 200;
    let width = imgElement.width || imgElement.naturalWidth;
    let height = imgElement.height || imgElement.naturalHeight;
    
    if (width > maxDimension || height > maxDimension) {
      if (width > height) {
        height = Math.round((height * maxDimension) / width);
        width = maxDimension;
      } else {
        width = Math.round((width * maxDimension) / height);
        height = maxDimension;
      }
    }
    
    const analysisCanvas = document.createElement('canvas');
    analysisCanvas.width = width;
    analysisCanvas.height = height;
    const analysisCtx = analysisCanvas.getContext('2d');
    analysisCtx.drawImage(imgElement, 0, 0, width, height);
    
    const imgData = analysisCtx.getImageData(0, 0, width, height);
    const data = imgData.data;
    
    // Sample corner colors
    const corners = [
      { r: data[0], g: data[1], b: data[2] },
      { r: data[(width - 1) * 4], g: data[(width - 1) * 4 + 1], b: data[(width - 1) * 4 + 2] },
      { r: data[(height - 1) * width * 4], g: data[(height - 1) * width * 4 + 1], b: data[(height - 1) * width * 4 + 2] },
      { r: data[((height - 1) * width + (width - 1)) * 4], g: data[((height - 1) * width + (width - 1)) * 4 + 1], b: data[((height - 1) * width + (width - 1)) * 4 + 2] }
    ];
    
    let bgR = Math.round(corners.reduce((sum, c) => sum + c.r, 0) / 4);
    let bgG = Math.round(corners.reduce((sum, c) => sum + c.g, 0) / 4);
    let bgB = Math.round(corners.reduce((sum, c) => sum + c.b, 0) / 4);
    
    let minX = width;
    let maxX = 0;
    let minY = height;
    let maxY = 0;
    
    const threshold = 35;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];
        
        if (a > 50) {
          const dist = Math.sqrt(
            Math.pow(r - bgR, 2) +
            Math.pow(g - bgG, 2) +
            Math.pow(b - bgB, 2)
          );
          
          if (dist > threshold) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
    }
    
    if (maxX >= minX && maxY >= minY) {
      let leftPct = (minX / width) * 100;
      let rightPct = 100 - ((maxX + 1) / width) * 100;
      let topPct = (minY / height) * 100;
      let bottomPct = 100 - ((maxY + 1) / height) * 100;
      
      let left = Math.round(Math.max(0, leftPct - 3));
      let right = Math.round(Math.max(0, rightPct - 3));
      let top = Math.round(Math.max(0, topPct - 3));
      let bottom = Math.round(Math.max(0, bottomPct - 3));
      
      if (left + right > 90) {
        const extra = (left + right) - 90;
        left = Math.max(0, left - Math.ceil(extra / 2));
        right = Math.max(0, right - Math.floor(extra / 2));
      }
      if (top + bottom > 90) {
        const extra = (top + bottom) - 90;
        top = Math.max(0, top - Math.ceil(extra / 2));
        bottom = Math.max(0, bottom - Math.floor(extra / 2));
      }
      
      setCropBox({ left, right, top, bottom });
      
      // Convert RGB to HEX
      const rgbToHex = (r, g, b) => '#' + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      }).join('');
      const estimatedHex = rgbToHex(bgR, bgG, bgB);

      setCropBgRemovalEnabled(true);
      setCropBgRemovalColor(estimatedHex);
      setCropBgRemovalTolerance(40);
    } else {
      setCropBox({ left: 0, right: 0, top: 0, bottom: 0 });
      setCropBgRemovalEnabled(false);
    }
  };

  const preprocessLayerImage = async (layer) => {
    const src = layer.originalUrl || layer.url;
    if (!src) return null;

    // Fast-path: if imageObj is already complete and dimensions are within limits, skip downscaling
    if (layer.imageObj && layer.imageObj.complete && layer.imageObj.naturalWidth) {
      const width = layer.imageObj.naturalWidth;
      const height = layer.imageObj.naturalHeight;
      const MAX_SIZE = 1920;
      if (width <= MAX_SIZE && height <= MAX_SIZE) {
        return null;
      }
    }

    // Skip if it is already a local object URL we created in this session
    if (src.startsWith('blob:') && createdObjectUrlsRef.current.includes(src)) {
      return null;
    }

    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const MAX_SIZE = 1920;
        let { width, height } = img;

        if (width <= MAX_SIZE && height <= MAX_SIZE) {
          resolve(null);
          return;
        }

        // Calculate aspect ratio-preserving dimensions
        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }

        console.log(`[Downscale] Resizing high-res image from ${img.width}x${img.height} to ${width}x${height} for performance.`);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          ctx.clearRect(0, 0, width, height);
          canvas.width = 0;
          canvas.height = 0;

          if (!blob) {
            resolve(null);
            return;
          }
          
          const objectUrl = URL.createObjectURL(blob);
          const resizedImg = new Image();
          resizedImg.crossOrigin = 'anonymous';
          resizedImg.onload = () => {
            resolve({
              url: objectUrl,
              originalUrl: objectUrl,
              imageObj: resizedImg
            });
          };
          resizedImg.onerror = () => {
            resolve(null);
          };
          resizedImg.src = objectUrl;
        }, 'image/png');
      };
      img.onerror = () => {
        resolve(null);
      };
      img.src = src;
    });
  };

  const cleanupResizedImages = () => {
    createdObjectUrlsRef.current.forEach(url => {
      try {
        URL.revokeObjectURL(url);
        console.log('[Cleanup] Revoked object URL:', url);
      } catch (err) {
        console.warn('Failed to revoke URL:', url, err);
      }
    });
    createdObjectUrlsRef.current = [];
  };

  const openEraserModal = async () => {
    if (!activeLayer) return;
    
    setIsPreprocessingImage(true);
    const processed = await preprocessLayerImage(activeLayer);
    setIsPreprocessingImage(false);
    
    if (processed) {
      createdObjectUrlsRef.current.push(processed.url);
      updateLayerProperties(activeLayerId, {
        url: processed.url,
        originalUrl: processed.originalUrl,
        imageObj: processed.imageObj
      });
    }
    
    setIsEraserModalOpen(true);
  };

  const openCropModal = async () => {
    if (!activeLayer) return;
    
    setIsPreprocessingImage(true);
    const processed = await preprocessLayerImage(activeLayer);
    setIsPreprocessingImage(false);
    
    if (processed) {
      createdObjectUrlsRef.current.push(processed.url);
      updateLayerProperties(activeLayerId, {
        url: processed.url,
        originalUrl: processed.originalUrl,
        imageObj: processed.imageObj
      });
    }
    
    setCropBgRemovalEnabled(false);
    setCropBgRemovalColor('#ffffff');
    setCropBgRemovalTolerance(40);
    setCropBox(activeLayer.cropBox || { left: 0, right: 0, top: 0, bottom: 0 });
    setCropZoom(activeLayer.cropZoom || 1.0);
    setCropRotation(activeLayer.cropRotation || 0);
    setCropFlipH(activeLayer.cropFlipH || false);
    setCropFlipV(activeLayer.cropFlipV || false);
    setCropOffsetX(activeLayer.cropOffsetX || 0);
    setCropOffsetY(activeLayer.cropOffsetY || 0);
    setCropAspectRatio(activeLayer.cropAspectRatio || 'Free');
    
    setIsCropModalOpen(true);
    
    setTimeout(() => {
      const canvas = cropCanvasRef.current;
      if (canvas) {
        canvas.width = 400;
        canvas.height = 400;
        redrawCropCanvas();
      }
    }, 100);
  };

  const redrawCropCanvas = () => {
    const canvas = cropCanvasRef.current;
    if (!canvas || !activeLayer || !activeLayer.originalUrl) return;
    const ctx = canvas.getContext('2d');

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = activeLayer.originalUrl;
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(canvas.width / 2 + cropOffsetX, canvas.height / 2 + cropOffsetY);

      const scaleX = (cropFlipH ? -1 : 1) * cropZoom;
      const scaleY = (cropFlipV ? -1 : 1) * cropZoom;
      ctx.scale(scaleX, scaleY);
      ctx.rotate((cropRotation * Math.PI) / 180);

      const imgRatio = img.width / img.height;
      let drawW = canvas.width;
      let drawH = canvas.height;
      if (imgRatio > 1) {
        drawH = canvas.width / imgRatio;
      } else {
        drawW = canvas.height * imgRatio;
      }
      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();

      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      const cropLeft = (canvas.width * cropBox.left) / 100;
      const cropTop = (canvas.height * cropBox.top) / 100;
      const cropW = canvas.width * (1 - cropBox.left / 100 - cropBox.right / 100);
      const cropH = canvas.height * (1 - cropBox.top / 100 - cropBox.bottom / 100);

      ctx.beginPath();
      ctx.rect(0, 0, canvas.width, canvas.height);
      ctx.rect(cropLeft, cropTop + cropH, cropW, -cropH);
      ctx.fill();

      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 2;
      ctx.strokeRect(cropLeft, cropTop, cropW, cropH);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cropLeft + cropW / 3, cropTop);
      ctx.lineTo(cropLeft + cropW / 3, cropTop + cropH);
      ctx.moveTo(cropLeft + (cropW * 2) / 3, cropTop);
      ctx.lineTo(cropLeft + (cropW * 2) / 3, cropTop + cropH);
      ctx.moveTo(cropLeft, cropTop + cropH / 3);
      ctx.lineTo(cropLeft + cropW, cropTop + cropH / 3);
      ctx.moveTo(cropLeft, cropTop + (cropH * 2) / 3);
      ctx.lineTo(cropLeft + cropW, cropTop + (cropH * 2) / 3);
      ctx.stroke();
    };
  };

  const handleCropCanvasMouseDown = (e) => {
    setIsDraggingCropPhoto(true);
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    dragCropStartRef.current = { x: clientX, y: clientY };
    dragCropOffsetStartRef.current = { x: cropOffsetX, y: cropOffsetY };
  };

  const handleCropCanvasMouseMove = (e) => {
    if (!isDraggingCropPhoto) return;
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    const dx = clientX - dragCropStartRef.current.x;
    const dy = clientY - dragCropStartRef.current.y;
    setCropOffsetX(dragCropOffsetStartRef.current.x + dx);
    setCropOffsetY(dragCropOffsetStartRef.current.y + dy);
  };

  const handleCropCanvasMouseUp = () => {
    setIsDraggingCropPhoto(false);
  };

  const handleFitFillFrame = (mode) => {
    const canvas = cropCanvasRef.current;
    if (!canvas || !activeLayer || !activeLayer.originalUrl) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = activeLayer.originalUrl;
    img.onload = () => {
      const cropW = canvas.width * (1 - cropBox.left / 100 - cropBox.right / 100);
      const cropH = canvas.height * (1 - cropBox.top / 100 - cropBox.bottom / 100);
      
      const imgRatio = img.width / img.height;
      let drawW = canvas.width;
      let drawH = canvas.height;
      if (imgRatio > 1) {
        drawH = canvas.width / imgRatio;
      } else {
        drawW = canvas.height * imgRatio;
      }
      
      const scaleX = cropW / drawW;
      const scaleY = cropH / drawH;
      
      let scale = 1.0;
      if (mode === 'fit') {
        scale = Math.min(scaleX, scaleY);
      } else {
        scale = Math.max(scaleX, scaleY);
      }
      
      setCropZoom(parseFloat(scale.toFixed(2)));
      setCropOffsetX(0);
      setCropOffsetY(0);
    };
  };

  const handleSetCropAspectRatio = (ratio) => {
    setCropAspectRatio(ratio);
    if (ratio === 'Free') {
      setCropBox({ left: 0, right: 0, top: 0, bottom: 0 });
    } else {
      const parts = ratio.split(':');
      const wRatio = parseInt(parts[0]);
      const hRatio = parseInt(parts[1]);
      const targetRatio = wRatio / hRatio;
      
      const canvasW = 400;
      const canvasH = 400;
      let targetW = canvasW;
      let targetH = canvasW / targetRatio;
      
      if (targetH > canvasH) {
        targetH = canvasH;
        targetW = canvasH * targetRatio;
      }
      
      const leftRightMargin = ((canvasW - targetW) / 2 / canvasW) * 100;
      const topBottomMargin = ((canvasH - targetH) / 2 / canvasH) * 100;
      
      setCropBox({
        left: Math.round(leftRightMargin),
        right: Math.round(leftRightMargin),
        top: Math.round(topBottomMargin),
        bottom: Math.round(topBottomMargin)
      });
    }
  };

  const handleResetCrop = () => {
    setCropBox({ left: 0, right: 0, top: 0, bottom: 0 });
    setCropZoom(1.0);
    setCropRotation(0);
    setCropFlipH(false);
    setCropFlipV(false);
    setCropOffsetX(0);
    setCropOffsetY(0);
    setCropAspectRatio('Free');
  };

  useEffect(() => {
    if (isCropModalOpen) {
      redrawCropCanvas();
    }
  }, [isCropModalOpen, cropZoom, cropRotation, cropFlipH, cropFlipV, cropOffsetX, cropOffsetY, cropBox]);

  const handleApplyCrop = () => {
    if (!activeLayer || !activeLayer.originalUrl) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = activeLayer.originalUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const ratio = img.width / 400;

      const cropLeft = (400 * cropBox.left) / 100;
      const cropTop = (400 * cropBox.top) / 100;
      const cropW = 400 * (1 - cropBox.left / 100 - cropBox.right / 100);
      const cropH = 400 * (1 - cropBox.top / 100 - cropBox.bottom / 100);

      canvas.width = cropW * ratio;
      canvas.height = cropH * ratio;

      ctx.save();
      ctx.translate(-cropLeft * ratio, -cropTop * ratio);
      ctx.translate((400 / 2) * ratio + cropOffsetX * ratio, (400 / 2) * ratio + cropOffsetY * ratio);

      const scaleX = (cropFlipH ? -1 : 1) * cropZoom;
      const scaleY = (cropFlipV ? -1 : 1) * cropZoom;
      ctx.scale(scaleX, scaleY);
      ctx.rotate((cropRotation * Math.PI) / 180);

      const imgRatio = img.width / img.height;
      let drawW = 400 * ratio;
      let drawH = 400 * ratio;
      if (imgRatio > 1) {
        drawH = (400 * ratio) / imgRatio;
      } else {
        drawW = (400 * ratio) * imgRatio;
      }
      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();

      // Apply client-side color cutout fallback if enabled
      if (cropBgRemovalEnabled) {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        
        // Parse target color hex
        const hex = cropBgRemovalColor.replace('#', '');
        const targetR = parseInt(hex.substring(0, 2), 16);
        const targetG = parseInt(hex.substring(2, 4), 16);
        const targetB = parseInt(hex.substring(4, 6), 16);
        const tolerance = cropBgRemovalTolerance;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i+1];
          const b = data[i+2];
          
          // Calculate distance in color space
          const dist = Math.sqrt(
            Math.pow(r - targetR, 2) +
            Math.pow(g - targetG, 2) +
            Math.pow(b - targetB, 2)
          );

          if (dist < tolerance) {
            data[i+3] = 0; // Make pixel fully transparent
          }
        }
        ctx.putImageData(imgData, 0, 0);
      }

      const croppedBase64 = canvas.toDataURL('image/png');
      
      // Clear temporary canvas buffer memory immediately
      canvas.width = 0;
      canvas.height = 0;

      const croppedImg = new Image();
      croppedImg.src = croppedBase64;
      croppedImg.onload = () => {
        updateLayerProperties(activeLayerId, {
          url: croppedBase64,
          imageObj: croppedImg,
          cropBox: { ...cropBox },
          cropZoom,
          cropRotation,
          cropFlipH,
          cropFlipV,
          cropOffsetX,
          cropOffsetY,
          cropAspectRatio
        });
        saveStateToHistory();
        cleanupResizedImages();
      };
      setIsCropModalOpen(false);
    };
  };

  const getBase64FromImage = (img) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width || 300;
      canvas.height = img.naturalHeight || img.height || 300;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      return canvas.toDataURL('image/png');
    } catch (e) {
      console.error("Failed to extract base64 from image:", e);
      throw e;
    }
  };

  const handleRemoveBackground = async () => {
    if (!activeLayer || !activeLayer.imageObj) return;
    setIsRemovingBg(true);
    setBgRemovalError(null);
    
    // Create an abort controller for timeout handling (45 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    try {
      setIsPreprocessingImage(true);
      const processed = await preprocessLayerImage(activeLayer);
      setIsPreprocessingImage(false);

      let targetImageObj = activeLayer.imageObj;
      let targetUrl = activeLayer.url;

      if (processed) {
        createdObjectUrlsRef.current.push(processed.url);
        updateLayerProperties(activeLayerId, {
          url: processed.url,
          originalUrl: processed.originalUrl,
          imageObj: processed.imageObj
        });
        targetImageObj = processed.imageObj;
        targetUrl = processed.url;
      }

      let base64Image = "";
      if (targetUrl && targetUrl.startsWith('data:')) {
        base64Image = targetUrl;
      } else {
        base64Image = getBase64FromImage(targetImageObj);
      }

      const { data } = await API.post(
        '/templates/remove-background', 
        { image: base64Image },
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);
      
      if (data.success && data.url) {
        const processedImg = new Image();
        processedImg.crossOrigin = 'anonymous';
        
        await new Promise((resolve, reject) => {
          processedImg.onload = () => {
            updateLayerProperties(activeLayerId, {
              url: data.url,
              originalUrl: data.url,
              imageObj: processedImg,
              bgRemovalEnabled: true,
              bgRemovalColor: '#ffffff',
              bgRemovalTolerance: 40
            });
            saveStateToHistory();
            cleanupResizedImages();
            setIsRemovingBg(false);
            resolve();
          };
          processedImg.onerror = () => {
            cleanupResizedImages();
            reject(new Error("Failed to load processed AI cut-out image from response URL."));
          };
          processedImg.src = data.url;
        });
      } else {
        cleanupResizedImages();
        throw new Error(data.message || "Backend AI segmentation failed.");
      }
    } catch (err) {
      clearTimeout(timeoutId);
      const isTimeout = err.name === 'CanceledError' || err.code === 'ECONNABORTED';
      // Extract the exact backend error message
      const backendMsg = err.response?.data?.message;
      const errMsg = isTimeout 
        ? "AI background removal timed out (took longer than 45 seconds). Try using the Manual Eraser instead." 
        : (backendMsg || err.message || "AI background removal failed.");

      console.error("[Remove Background] Error:", err);
      setBgRemovalError(errMsg);
      setIsRemovingBg(false);
    }
  };

  const isAdmin = () => {
    return user && (user.role === 'admin' || user.email === 'harry@memoriastudio.com');
  };

  const handleSaveAdminTemplate = async () => {
    try {
      setPurchasing(true);
      const cleanLayers = layers.map(l => {
        const { imageObj, ...rest } = l;
        return rest;
      });

      const payload = {
        config: {
          canvasWidth: template.config?.canvasWidth || 1080,
          canvasHeight: template.config?.canvasHeight || 1080,
          layers: cleanLayers
        }
      };

      const { data } = await API.put(`/templates/${id}`, payload);
      if (data.success) {
        alert('Admin Template Layout successfully saved!');
        setTemplate(data.data);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to save layout configuration.');
    } finally {
      setPurchasing(false);
    }
  };

  const handlePurchaseCheckout = async () => {
    if (!user) {
      navigate('/login?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }
    try {
      setPurchasing(true);
      
      const cleanLayers = layers.map(l => {
        const { imageObj, ...rest } = l;
        return rest;
      });

      const customizedData = {
        layers: cleanLayers,
        audioSettings: {
          audioOption,
          trimStart,
          trimEnd,
          originalVolume,
          customAudioVolume,
          bgMusicVolume,
          customAudioUrl,
          bgMusicUrl
        }
      };

      const { data } = await API.post('/orders/create', {
        templateId: id,
        customizedData
      });

      if (data.success) {
        if (data.alreadyPurchased || data.adminFreeAccess) {
          setIsPurchased(true);
        } else {
          navigate(`/checkout/${data.orderId}`);
        }
      }
    } catch (err) {
      console.error(err);
      alert('Order creation failed.');
    } finally {
      setPurchasing(false);
    }
  };

  const handleExportVideo = async () => {
    if (!canvasRef.current || !videoRef.current) return;
    setIsExporting(true);
    setExportProgress(5);

    const canvas = canvasRef.current;
    const stream = canvas.captureStream(30);

    let options = { mimeType: 'video/webm;codecs=vp9' };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) options = { mimeType: 'video/webm' };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) options = { mimeType: 'video/mp4' };

    const mediaRecorder = new MediaRecorder(stream, options);
    const chunks = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      try {
        setExportProgress(80);
        const webmBlob = new Blob(chunks, { type: options.mimeType });

        const formData = new FormData();
        formData.append('video', webmBlob, 'canvas_recording.webm');
        formData.append('templateId', id);
        formData.append('audioOption', audioOption);
        formData.append('trimStart', trimStart);
        formData.append('trimEnd', trimEnd);
        formData.append('originalVolume', originalVolume);
        formData.append('customAudioVolume', customAudioVolume);
        formData.append('bgMusicVolume', bgMusicVolume);
        formData.append('duration', duration);

        let insertIndex = 0;
        const inserts = layers
          .filter(l => (l.type === 'image' || l.type === 'video') && l.playbackMode === 'insert')
          .map(l => {
            const item = { 
              startTime: l.startTime, 
              endTime: l.endTime, 
              url: l.url,
              audioOption: l.audioOption || (l.type === 'video' ? 'keep' : 'none'),
              volume: l.volume !== undefined ? l.volume : 1.0,
              audioTrimStart: l.audioTrimStart || 0,
              audioTrimEnd: l.audioTrimEnd || (l.videoObj?.duration || l.audioObj?.duration || 5),
            };
            if (l.type === 'video' && l.file) {
              item.videoIndex = insertIndex;
              formData.append(`insert_video_${insertIndex}`, l.file);
            }
            if (l.audioOption === 'replace' && l.customAudioFile) {
              item.audioIndex = insertIndex;
              formData.append(`insert_audio_${insertIndex}`, l.customAudioFile);
            }
            insertIndex++;
            return item;
          });
        formData.append('inserts', JSON.stringify(inserts));

        let overlayIndex = 0;
        const overlays = layers
          .filter(l => (l.type === 'video' || l.type === 'image' || l.type === 'symbol') && l.playbackMode !== 'insert')
          .map(l => {
            const item = {
              startTime: l.startTime,
              endTime: l.endTime,
              url: l.url,
              audioOption: l.audioOption || (l.type === 'video' ? 'keep' : 'none'),
              volume: l.volume !== undefined ? l.volume : 1.0,
              audioTrimStart: l.audioTrimStart || 0,
              audioTrimEnd: l.audioTrimEnd || (l.videoObj?.duration || l.audioObj?.duration || 5),
            };
            if (l.type === 'video' && l.file) {
              item.videoIndex = overlayIndex;
              formData.append(`overlay_video_${overlayIndex}`, l.file);
            }
            if (l.audioOption === 'replace' && l.customAudioFile) {
              item.audioIndex = overlayIndex;
              formData.append(`overlay_audio_${overlayIndex}`, l.customAudioFile);
            }
            overlayIndex++;
            return item;
          });
        formData.append('overlays', JSON.stringify(overlays));

        if (audioOption === 'replace' && customAudioFile) {
          formData.append('audio', customAudioFile);
        } else if (audioOption === 'replace' && customAudioUrl) {
          formData.append('customAudioUrl', customAudioUrl);
        }

        if (bgMusicFile) {
          formData.append('bgMusic', bgMusicFile);
        } else if (bgMusicUrl) {
          formData.append('bgMusicUrl', bgMusicUrl);
        }

        const { data } = await API.post('/templates/process-video', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (data.success && data.fileUrl) {
          setExportProgress(100);
          const res = await fetch(data.fileUrl);
          const mp4 = await res.blob();
          await downloadBlob(mp4, data.filename, {
            description: 'Customized Video',
            accept: { 'video/mp4': ['.mp4'] }
          });
        } else {
          alert('Backend processing failed.');
        }
      } catch (err) {
        console.error(err);
        alert('Stitching failed.');
      } finally {
        setIsExporting(false);
        setExportProgress(0);
        if (videoRef.current) {
          videoRef.current.loop = false;
          videoRef.current.pause();
          videoRef.current.currentTime = 0;
        }
      }
    };

    setIsPlaying(false);

    const video = videoRef.current;
    video.pause();
    video.loop = false;
    video.currentTime = 0;
    setCurrentTime(0);

    setTimeout(() => {
      mediaRecorder.start();
      setExportProgress(30);
      setIsPlaying(true);

      const checkEnd = setInterval(() => {
        if (currentTimeRef.current >= duration - 0.1) {
          clearInterval(checkEnd);
          setIsPlaying(false);
          if (videoRef.current) videoRef.current.pause();
          mediaRecorder.stop();
          setExportProgress(65);
        }
      }, 200);
    }, 500);
  };

  const handleExportImage = (format = 'png') => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const mime = format === 'jpg' ? 'image/jpeg' : 'image/png';
    const ext = format === 'jpg' ? '.jpg' : '.png';
    const dataUrl = canvas.toDataURL(mime, 0.95);
    
    const safeTitle = (template?.title || 'customized_image').toLowerCase().replace(/[^a-z0-9]/g, '_');
    const link = document.createElement('a');
    link.download = `${safeTitle}_output${ext}`;
    link.href = dataUrl;
    link.click();
  };

  const stopGesturePropagation = (e) => {
    e.stopPropagation();
  };

  const handleLayerActionButtonClick = (e, layerId, callback) => {
    e.stopPropagation();
    setActiveLayerId(layerId);
    callback();
  };

  // DRY style properties rendering for desktop vs mobile drawer
  const renderPropertiesContent = () => {
    if (!activeLayer) {
      return <p className="no-active-info">Select a layer element on the canvas to inspect and edit its properties.</p>;
    }
    return (
      <div className="properties-content">
        <h3>Type: {activeLayer.type.toUpperCase()}</h3>
        <p>Name: <strong>{activeLayer.name}</strong></p>

        {(activeLayer.type === 'image' || activeLayer.type === 'symbol' || activeLayer.type === 'video') && activeLayer.originalUrl && (
          <>
            {activeLayer.type !== 'video' && (
              <div className="control-group" style={{ marginBottom: '15px' }}>
                <button className="btn btn-secondary w-full" onClick={openCropModal} style={{ background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', color: '#ffffff', border: 'none', fontWeight: 'bold' }}>
                  &#9986;&#65039; Crop / Cutout Photo
                </button>
              </div>
            )}

            {(activeLayer.url || activeLayer.originalUrl) && (
              <div className="control-group" style={{ marginBottom: '15px' }}>
                <button 
                  className="btn w-full" 
                  onClick={() => handleRemovePhoto(activeLayer.id)} 
                  style={{ background: '#ef4444', color: '#ffffff', border: 'none', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  &#128465;&#65039; Remove Photo / Video
                </button>
              </div>
            )}

            {(activeLayer.type === 'image' || activeLayer.type === 'video') && (
              <div className="control-group" style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '6px', fontWeight: 'bold' }}>Playback Mode</label>
                <select
                  value={activeLayer.playbackMode || 'overlay'}
                  onChange={(e) => {
                    updateLayerProperties(activeLayer.id, { playbackMode: e.target.value });
                    saveStateToHistory();
                  }}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '6px',
                    background: '#1e293b',
                    color: '#ffffff',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    fontSize: '0.85rem'
                  }}
                >
                  <option value="overlay">Overlay Mode (plays on top)</option>
                  <option value="insert">Insert Mode (sequential playback)</option>
                </select>
              </div>
            )}

            {activeLayer.type === 'video' && (
              <div className="specific-properties video-audio-settings" style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', marginBottom: '15px' }}>
                <h3 style={{ fontSize: '0.95rem', color: '#f1f5f9', marginBottom: '10px' }}>Video Audio Controls</h3>
                
                <div className="control-group" style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px' }}>Audio Option</label>
                  <select
                    value={activeLayer.audioOption || 'keep'}
                    onChange={(e) => {
                      updateLayerProperties(activeLayer.id, { audioOption: e.target.value });
                      saveStateToHistory();
                    }}
                    style={{
                      width: '100%',
                      padding: '6px',
                      borderRadius: '4px',
                      background: '#1e293b',
                      color: '#ffffff',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      fontSize: '0.8rem'
                    }}
                  >
                    <option value="keep">Keep Original Video Audio</option>
                    <option value="mute">Mute Video Audio</option>
                    <option value="replace">Replace Video Audio</option>
                  </select>
                </div>

                {activeLayer.audioOption !== 'mute' && (
                  <div className="control-group" style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px' }}>
                      Volume ({Math.round((activeLayer.volume !== undefined ? activeLayer.volume : 1.0) * 100)}%)
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={activeLayer.volume !== undefined ? activeLayer.volume : 1.0}
                      onChange={(e) => {
                        updateLayerProperties(activeLayer.id, { volume: parseFloat(e.target.value) });
                      }}
                      style={{ width: '100%' }}
                    />
                  </div>
                )}

                {activeLayer.audioOption === 'replace' && (
                  <div className="control-group" style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px' }}>
                      Upload Replacement Audio
                    </label>
                    <input
                      type="file"
                      accept="audio/mp3,audio/wav,audio/x-m4a,audio/*"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const audioUrl = URL.createObjectURL(file);
                          const audioObj = new Audio(audioUrl);
                          updateLayerProperties(activeLayer.id, {
                            customAudioUrl: audioUrl,
                            customAudioFile: file,
                            audioObj: audioObj
                          });
                          saveStateToHistory();
                        }
                        e.target.value = '';
                      }}
                      style={{ fontSize: '0.8rem', color: '#cbd5e1' }}
                    />
                    {activeLayer.customAudioUrl && (
                      <div style={{ marginTop: '6px', fontSize: '0.75rem', color: '#4ade80' }}>
                        ✓ Audio Loaded
                      </div>
                    )}
                  </div>
                )}

                <div className="control-group" style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px' }}>
                    Trim Start ({Math.round(activeLayer.audioTrimStart || 0)}s)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max={activeLayer.videoObj?.duration || 10}
                    step="0.5"
                    value={activeLayer.audioTrimStart || 0}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      const trimEnd = activeLayer.audioTrimEnd || activeLayer.videoObj?.duration || 10;
                      updateLayerProperties(activeLayer.id, { 
                        audioTrimStart: val,
                        audioTrimEnd: Math.max(val + 0.5, trimEnd)
                      });
                    }}
                    onMouseUp={() => saveStateToHistory()}
                    style={{ width: '100%' }}
                  />
                </div>

                <div className="control-group" style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px' }}>
                    Trim End ({Math.round(activeLayer.audioTrimEnd || activeLayer.videoObj?.duration || 10)}s)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max={activeLayer.videoObj?.duration || 10}
                    step="0.5"
                    value={activeLayer.audioTrimEnd || activeLayer.videoObj?.duration || 10}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      const trimStart = activeLayer.audioTrimStart || 0;
                      updateLayerProperties(activeLayer.id, { 
                        audioTrimEnd: Math.max(trimStart + 0.5, val)
                      });
                    }}
                    onMouseUp={() => saveStateToHistory()}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            )}

            {(activeLayer.type === 'image' || activeLayer.type === 'symbol') && (
              <div className="specific-properties image-audio-settings" style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', marginBottom: '15px' }}>
                <h3 style={{ fontSize: '0.95rem', color: '#f1f5f9', marginBottom: '10px' }}>Image Audio Controls</h3>
                
                <div className="control-group" style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px' }}>Audio Option</label>
                  <select
                    value={activeLayer.audioOption || 'none'}
                    onChange={(e) => {
                      updateLayerProperties(activeLayer.id, { audioOption: e.target.value });
                      saveStateToHistory();
                    }}
                    style={{
                      width: '100%',
                      padding: '6px',
                      borderRadius: '4px',
                      background: '#1e293b',
                      color: '#ffffff',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      fontSize: '0.8rem'
                    }}
                  >
                    <option value="none">No Audio (Default)</option>
                    <option value="replace">Add / Replace Audio</option>
                  </select>
                </div>

                {activeLayer.audioOption === 'replace' && (
                  <>
                    <div className="control-group" style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px' }}>
                        Volume ({Math.round((activeLayer.volume !== undefined ? activeLayer.volume : 1.0) * 100)}%)
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={activeLayer.volume !== undefined ? activeLayer.volume : 1.0}
                        onChange={(e) => {
                          updateLayerProperties(activeLayer.id, { volume: parseFloat(e.target.value) });
                        }}
                        style={{ width: '100%' }}
                      />
                    </div>

                    <div className="control-group" style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px' }}>
                        Upload Audio File
                      </label>
                      <input
                        type="file"
                        accept="audio/mp3,audio/wav,audio/x-m4a,audio/*"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            const audioUrl = URL.createObjectURL(file);
                            const audioObj = new Audio(audioUrl);
                            audioObj.onloadedmetadata = () => {
                              updateLayerProperties(activeLayer.id, {
                                audioTrimEnd: audioObj.duration
                              });
                            };
                            updateLayerProperties(activeLayer.id, {
                              customAudioUrl: audioUrl,
                              customAudioFile: file,
                              audioObj: audioObj,
                              audioTrimStart: 0,
                              audioTrimEnd: 10
                            });
                            saveStateToHistory();
                          }
                          e.target.value = '';
                        }}
                        style={{ fontSize: '0.8rem', color: '#cbd5e1' }}
                      />
                      {activeLayer.customAudioUrl && (
                        <div style={{ marginTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.75rem', color: '#4ade80' }}>✓ Audio Loaded</span>
                          <button 
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              updateLayerProperties(activeLayer.id, {
                                audioOption: 'none',
                                customAudioUrl: '',
                                customAudioFile: null,
                                audioObj: null,
                                audioTrimStart: 0,
                                audioTrimEnd: 0
                              });
                              saveStateToHistory();
                            }}
                            style={{ padding: '2px 6px', fontSize: '0.7rem', background: '#dc2626', color: '#ffffff', border: 'none' }}
                          >
                            Remove Audio
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="control-group" style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px' }}>
                        Trim Start ({Math.round(activeLayer.audioTrimStart || 0)}s)
                      </label>
                      <input
                        type="range"
                        min="0"
                        max={activeLayer.audioObj?.duration || 30}
                        step="0.5"
                        value={activeLayer.audioTrimStart || 0}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          const trimEnd = activeLayer.audioTrimEnd || activeLayer.audioObj?.duration || 30;
                          updateLayerProperties(activeLayer.id, { 
                            audioTrimStart: val,
                            audioTrimEnd: Math.max(val + 0.5, trimEnd)
                          });
                        }}
                        onMouseUp={() => saveStateToHistory()}
                        style={{ width: '100%' }}
                      />
                    </div>

                    <div className="control-group" style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px' }}>
                        Trim End ({Math.round(activeLayer.audioTrimEnd || activeLayer.audioObj?.duration || 30)}s)
                      </label>
                      <input
                        type="range"
                        min="0"
                        max={activeLayer.audioObj?.duration || 30}
                        step="0.5"
                        value={activeLayer.audioTrimEnd || activeLayer.audioObj?.duration || 30}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          const trimStart = activeLayer.audioTrimStart || 0;
                          updateLayerProperties(activeLayer.id, { 
                            audioTrimEnd: Math.max(trimStart + 0.5, val)
                          });
                        }}
                        onMouseUp={() => saveStateToHistory()}
                        style={{ width: '100%' }}
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {activeLayer.type !== 'video' && (
              <div className="control-group" style={{ marginBottom: '15px' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: bgRemovalError ? '0' : '0' }}>
                  <button 
                    type="button"
                    className="btn btn-secondary" 
                    onClick={handleRemoveBackground}
                    disabled={isRemovingBg}
                    style={{ 
                      flex: 1,
                      background: isRemovingBg ? '#475569' : 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)', 
                      color: '#ffffff', 
                      border: 'none', 
                      fontWeight: 'bold', 
                      cursor: isRemovingBg ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      fontSize: '0.8rem'
                    }}
                  >
                    {isRemovingBg ? 'Processing...' : '✨ AI Remove'}
                  </button>
                  <button 
                    type="button"
                    className="btn btn-secondary" 
                    onClick={openEraserModal}
                    style={{ 
                      flex: 1,
                      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', 
                      color: '#ffffff', 
                      border: 'none', 
                      fontWeight: 'bold', 
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      fontSize: '0.8rem'
                    }}
                  >
                    🖌 Manual Eraser
                  </button>
                </div>
                {bgRemovalError && (
                  <div style={{ color: '#fca5a5', fontSize: '0.75rem', marginTop: '6px', lineHeight: '1.2' }}>
                    ⚠️ {bgRemovalError}
                  </div>
                )}
              </div>
            )}

            {template.config?.photoBox && (
              <div className="control-group" style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
                <button 
                  type="button"
                  className="btn btn-secondary" 
                  onClick={() => {
                    const pb = template.config.photoBox;
                    updateLayerProperties(activeLayerId, {
                      x: pb.x,
                      y: pb.y,
                      width: pb.width,
                      height: pb.height,
                      rotation: 0
                    });
                    saveStateToHistory();
                  }}
                  style={{ flex: 1, fontSize: '0.8rem', padding: '8px' }}
                >
                  🔳 Fit to Frame
                </button>
                <button 
                  type="button"
                  className="btn btn-secondary" 
                  onClick={() => {
                    const pb = template.config.photoBox;
                    updateLayerProperties(activeLayerId, {
                      x: pb.x - pb.width * 0.05,
                      y: pb.y - pb.height * 0.05,
                      width: Math.round(pb.width * 1.1),
                      height: Math.round(pb.height * 1.1),
                      rotation: 0
                    });
                    saveStateToHistory();
                  }}
                  style={{ flex: 1, fontSize: '0.8rem', padding: '8px' }}
                >
                  🔳 Fill Frame
                </button>
              </div>
            )}

            <div className="control-group" style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
              <button 
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  updateLayerProperties(activeLayerId, { flipH: !activeLayer.flipH });
                  saveStateToHistory();
                }}
                style={{ flex: 1, fontSize: '0.8rem', padding: '8px', background: activeLayer.flipH ? 'var(--primary)' : '' }}
              >
                ↔️ Flip H
              </button>
              <button 
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  updateLayerProperties(activeLayerId, { flipV: !activeLayer.flipV });
                  saveStateToHistory();
                }}
                style={{ flex: 1, fontSize: '0.8rem', padding: '8px', background: activeLayer.flipV ? 'var(--primary)' : '' }}
              >
                ↕️ Flip V
              </button>
            </div>

            <div className="control-group" style={{ marginBottom: '15px' }}>
              <label>Photo Zoom / Scale</label>
              <input 
                type="range"
                min="10"
                max="300"
                value={Math.round((activeLayer.width / (template.config?.photoBox?.width || 250)) * 100)}
                onChange={(e) => {
                  const pct = parseInt(e.target.value) / 100;
                  const baseW = template.config?.photoBox?.width || 250;
                  const baseH = template.config?.photoBox?.height || 250;
                  updateLayerProperties(activeLayerId, {
                    width: Math.round(baseW * pct),
                    height: Math.round(baseH * pct)
                  });
                }}
                onMouseUp={saveStateToHistory}
                onTouchEnd={saveStateToHistory}
              />
            </div>
          </>
        )}

        <div className="property-row">
          <label>Width</label>
          <input type="number" value={activeLayer.width} onChange={(e) => updateLayerProperties(activeLayerId, { width: parseInt(e.target.value) || 30 })} />
        </div>
        <div className="property-row">
          <label>Height</label>
          <input type="number" value={activeLayer.height} onChange={(e) => updateLayerProperties(activeLayerId, { height: parseInt(e.target.value) || 30 })} />
        </div>
        <div className="property-row">
          <label>Rotation (°)</label>
          <input type="range" min="-180" max="180" value={activeLayer.rotation} onChange={(e) => updateLayerProperties(activeLayerId, { rotation: parseInt(e.target.value) })} />
        </div>
        <div className="property-row">
          <label>Opacity ({Math.round((activeLayer.opacity !== undefined ? activeLayer.opacity : 1.0) * 100)}%)</label>
          <input type="range" min="0" max="1" step="0.1" value={activeLayer.opacity !== undefined ? activeLayer.opacity : 1.0} onChange={(e) => updateLayerProperties(activeLayerId, { opacity: parseFloat(e.target.value) })} />
        </div>

        {activeLayer.type === 'text' && (
          <div className="specific-properties text-specific">
            <div className="control-group">
              <label>✍️ Text Content</label>
              <textarea value={activeLayer.text} onChange={(e) => updateLayerProperties(activeLayerId, { text: e.target.value })} />
            </div>

            <div className="control-group">
              <label>Font Family</label>
              <select value={activeLayer.fontFamily} onChange={(e) => updateLayerProperties(activeLayerId, { fontFamily: e.target.value })}>
                {FONT_OPTIONS.map((f, i) => (
                  <option key={i} value={f} style={{ fontFamily: f }}>{f}</option>
                ))}
              </select>
            </div>

            <div className="control-group">
              <label>Font Size ({activeLayer.fontSize}px)</label>
              <input type="range" min="12" max="120" value={activeLayer.fontSize} onChange={(e) => updateLayerProperties(activeLayerId, { fontSize: parseInt(e.target.value) })} />
            </div>

            <div className="control-group">
              <label>Text Color</label>
              <input type="color" value={activeLayer.color || '#ffffff'} onChange={(e) => updateLayerProperties(activeLayerId, { color: e.target.value, gradientColors: null })} />
            </div>

            <div className="control-group">
              <label>Gradient Fill (Optional)</label>
              <div className="gradient-controls">
                <button className="btn-sm" onClick={() => updateLayerProperties(activeLayerId, { gradientColors: ['#ff8a00', '#da1b60'] })}>Grad 1</button>
                <button className="btn-sm" onClick={() => updateLayerProperties(activeLayerId, { gradientColors: ['#6366f1', '#a855f7'] })}>Grad 2</button>
                <button className="btn-sm" onClick={() => updateLayerProperties(activeLayerId, { gradientColors: null })}>Reset Solid</button>
              </div>
            </div>

            <div className="control-group">
              <label>Text Style</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  type="button"
                  onClick={() => {
                    updateLayerProperties(activeLayerId, { fontWeight: activeLayer.fontWeight === 'bold' ? 'normal' : 'bold' });
                    saveStateToHistory();
                  }}
                  style={{ 
                    flex: 1, 
                    padding: '8px', 
                    fontWeight: 'bold', 
                    background: activeLayer.fontWeight === 'bold' ? 'var(--primary)' : 'rgba(255,255,255,0.05)', 
                    color: '#ffffff', 
                    border: '1px solid rgba(255,255,255,0.1)', 
                    borderRadius: '6px', 
                    cursor: 'pointer' 
                  }}
                >
                  Bold
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    updateLayerProperties(activeLayerId, { fontStyle: activeLayer.fontStyle === 'italic' ? 'normal' : 'italic' });
                    saveStateToHistory();
                  }}
                  style={{ 
                    flex: 1, 
                    padding: '8px', 
                    fontStyle: 'italic', 
                    background: activeLayer.fontStyle === 'italic' ? 'var(--primary)' : 'rgba(255,255,255,0.05)', 
                    color: '#ffffff', 
                    border: '1px solid rgba(255,255,255,0.1)', 
                    borderRadius: '6px', 
                    cursor: 'pointer' 
                  }}
                >
                  Italic
                </button>
              </div>
            </div>

            <div className="control-group">
              <label>Font Weight / Styling</label>
              <select value={activeLayer.fontWeight} onChange={(e) => updateLayerProperties(activeLayerId, { fontWeight: e.target.value })}>
                <option value="normal">Normal</option>
                <option value="bold">Bold</option>
                <option value="bolder">Bolder</option>
                <option value="light">Light</option>
              </select>
            </div>

            <div className="control-group">
              <label>Align</label>
              <select value={activeLayer.align} onChange={(e) => updateLayerProperties(activeLayerId, { align: e.target.value })}>
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </div>

            <div className="control-group">
              <label>Line Spacing</label>
              <input type="range" min="0.8" max="2" step="0.1" value={activeLayer.lineSpacing || 1.2} onChange={(e) => updateLayerProperties(activeLayerId, { lineSpacing: parseFloat(e.target.value) })} />
            </div>

            <div className="control-group">
              <label>Letter Spacing ({activeLayer.letterSpacing || 0}px)</label>
              <input 
                type="range" 
                min="-5" 
                max="25" 
                value={activeLayer.letterSpacing || 0} 
                onChange={(e) => updateLayerProperties(activeLayerId, { letterSpacing: parseInt(e.target.value) })}
                onMouseUp={saveStateToHistory}
                onTouchEnd={saveStateToHistory}
              />
            </div>

            <div className="control-group">
              <label>Outline Color</label>
              <input type="color" value={activeLayer.outlineColor || '#000000'} onChange={(e) => updateLayerProperties(activeLayerId, { outlineColor: e.target.value })} />
            </div>
            <div className="control-group">
              <label>Outline Width</label>
              <input type="range" min="0" max="10" value={activeLayer.outlineWidth || 0} onChange={(e) => updateLayerProperties(activeLayerId, { outlineWidth: parseInt(e.target.value) })} />
            </div>
          </div>
        )}

        {template?.type === 'video' && activeLayer.type !== 'background' && (
          <div className="specific-properties anim-specific">
            <h3>Layer Entrance Animations</h3>
            <div className="control-group">
              <label>Animation Preset</label>
              <select value={activeLayer.animation?.type || 'none'} onChange={(e) => updateLayerProperties(activeLayerId, { animation: { ...(activeLayer.animation || {}), type: e.target.value } })}>
                <option value="none">None</option>
                <option value="fade">Fade In</option>
                <option value="zoom">Zoom Scale</option>
                <option value="slide-left">Slide Left</option>
                <option value="slide-right">Slide Right</option>
                <option value="bounce">Bounce</option>
              </select>
            </div>
            <div className="control-group">
              <label>Duration (s)</label>
              <input type="range" min="0.1" max="3" step="0.1" value={activeLayer.animation?.duration || 0.5} onChange={(e) => updateLayerProperties(activeLayerId, { animation: { ...(activeLayer.animation || {}), duration: parseFloat(e.target.value) } })} />
            </div>
          </div>
        )}

        {isAdmin() && activeLayer.type !== 'background' && (
          <div className="specific-properties admin-settings">
            <h3>Admin Permissions</h3>
            <div className="control-group">
              <label className="checkbox-label">
                <input type="checkbox" checked={activeLayer.userEditable !== false} onChange={(e) => updateLayerProperties(activeLayerId, { userEditable: e.target.checked })} />
                User Editable
              </label>
            </div>
          </div>
        )}

        {activeLayer.type !== 'background' && (
          <>
            <div className="control-group" style={{ marginTop: '15px', display: 'flex', gap: '8px' }}>
              <button 
                type="button"
                className="btn-sm" 
                onPointerDown={stopGesturePropagation}
                onTouchStart={stopGesturePropagation}
                onMouseDown={stopGesturePropagation}
                onClick={() => adjustLayerOrder(activeLayer.id, 'forward')}
                style={{ flex: 1, background: '#374151', color: '#ffffff', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}
              >
                ▲ {language === 'en' ? 'Up' : 'పైకి'}
              </button>
              <button 
                type="button"
                className="btn-sm" 
                onPointerDown={stopGesturePropagation}
                onTouchStart={stopGesturePropagation}
                onMouseDown={stopGesturePropagation}
                onClick={() => adjustLayerOrder(activeLayer.id, 'backward')}
                style={{ flex: 1, background: '#374151', color: '#ffffff', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}
              >
                ▼ {language === 'en' ? 'Down' : 'క్రిందికి'}
              </button>
              <button 
                type="button"
                className="btn-sm" 
                onPointerDown={stopGesturePropagation}
                onTouchStart={stopGesturePropagation}
                onMouseDown={stopGesturePropagation}
                onClick={() => bringToFront(activeLayer.id)}
                style={{ flex: 1, background: '#374151', color: '#ffffff', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}
              >
                🔝 {language === 'en' ? 'Front' : 'పైభాగం'}
              </button>
              <button 
                type="button"
                className="btn-sm" 
                onPointerDown={stopGesturePropagation}
                onTouchStart={stopGesturePropagation}
                onMouseDown={stopGesturePropagation}
                onClick={() => sendToBack(activeLayer.id)}
                style={{ flex: 1, background: '#374151', color: '#ffffff', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}
              >
                🔚 {language === 'en' ? 'Back' : 'క్రిందిభాగం'}
              </button>
            </div>

            <div className="control-group" style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', gap: '8px' }}>
              <button 
                type="button"
                className="btn" 
                onPointerDown={stopGesturePropagation}
                onTouchStart={stopGesturePropagation}
                onMouseDown={stopGesturePropagation}
                onClick={() => duplicateLayer(activeLayer.id)} 
                style={{ flex: 1, background: '#6366f1', color: '#ffffff', border: 'none', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px 14px', borderRadius: '6px' }}
              >
                📋 {language === 'en' ? 'Duplicate' : 'నకలు'}
              </button>
              <button 
                type="button"
                className="btn" 
                onPointerDown={stopGesturePropagation}
                onTouchStart={stopGesturePropagation}
                onMouseDown={stopGesturePropagation}
                onClick={() => deleteLayer(activeLayer.id)} 
                style={{ flex: 1, background: '#ef4444', color: '#ffffff', border: 'none', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px 14px', borderRadius: '6px' }}
              >
                🗑️ {language === 'en' ? 'Delete' : 'తొలగించు'}
              </button>
            </div>
          </>
        )}
      </div>
    );
  };

  if (loading) return <div className="loader-container"><div className="loader"></div></div>;
  if (error) return <div className="error-container"><div className="error-message">❌ {error}</div></div>;
  if (!template) return <div className="error-container"><div className="error-message">Template not found.</div></div>;

  return (
    <div className="unified-editor-page">
      {/* Editor Header */}
      <header className="editor-header">
        <div className="editor-header-left">
          <Link to="/templates" className="back-btn-editor">🡰 Back</Link>
          <div className="editor-title-group">
            <h1>{template.title}</h1>
            <span className="badge-editor-type">{template.type.toUpperCase()}</span>
          </div>
        </div>

        <div className="editor-header-center">
          <button 
            type="button"
            className="btn-translate-toggle" 
            onClick={toggleLanguage}
            style={{ 
              background: language === 'te' ? 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)' : 'rgba(255, 255, 255, 0.05)', 
              color: '#ffffff', 
              border: '1px solid rgba(255,255,255,0.1)', 
              borderRadius: '6px', 
              padding: '6px 12px', 
              fontSize: '0.85rem',
              fontWeight: '600',
              cursor: 'pointer',
              marginRight: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            🌐 {language === 'en' ? 'Translate to Telugu' : 'English View'}
          </button>
          <button className="btn-undo" onClick={handleUndo} disabled={historyIndex <= 0}>⮪ Undo</button>
          <button className="btn-redo" onClick={handleRedo} disabled={historyIndex >= history.length - 1}>⮫ Redo</button>
          <div className="zoom-control">
            <button onClick={() => setZoomScale(prev => Math.max(0.1, prev - 0.1))}>-</button>
            <span>{Math.round(zoomScale * 100)}%</span>
            <button onClick={() => setZoomScale(prev => Math.min(1.5, prev + 0.1))}>+</button>
          </div>
        </div>

        <div className="editor-header-right">
          {isAdmin() && (
            <button className="btn-admin-save" onClick={handleSaveAdminTemplate}>
              💾 Save Admin Layout
            </button>
          )}

          {isPurchased ? (
            template.type === 'video' ? (
              <button className="btn-export-trigger" onClick={handleExportVideo} disabled={isExporting}>
                {isExporting ? `Exporting ${exportProgress}%` : '📥 Download Video MP4'}
              </button>
            ) : (
              <div className="image-export-group">
                <button className="btn-export-trigger" onClick={() => handleExportImage('png')}>📥 Download PNG</button>
                <button className="btn-export-trigger" onClick={() => handleExportImage('jpg')}>📥 Download JPG</button>
              </div>
            )
          ) : (
            <button className="btn-buy-trigger" onClick={handlePurchaseCheckout} disabled={purchasing}>
              {purchasing ? 'Starting Order...' : `Unlock for ₹${template.price}`}
            </button>
          )}
        </div>
      </header>

      {/* Editor workspace */}
      <div className="editor-body">
        
        {/* Left Toolbar Tabs selector */}
        <aside className="editor-left-tabs">
          <button className={activeTab === 'layers' ? 'active' : ''} onClick={() => setActiveTab(activeTab === 'layers' ? null : 'layers')}>🗂️ Layers</button>
          <button className={activeTab === 'text' ? 'active' : ''} onClick={() => setActiveTab(activeTab === 'text' ? null : 'text')}>🔤 Text</button>
          <button className={activeTab === 'uploads' ? 'active' : ''} onClick={() => setActiveTab(activeTab === 'uploads' ? null : 'uploads')}>📤 Uploads</button>
          <button className={activeTab === 'presets' ? 'active' : ''} onClick={() => setActiveTab(activeTab === 'presets' ? null : 'presets')}>🏵️ Presets</button>
          <button className={`tab-only-mobile ${activeTab === 'properties' ? 'active' : ''}`} onClick={() => setActiveTab(activeTab === 'properties' ? null : 'properties')}>🎨 Style</button>
          {template.type === 'video' && (
            <button className={activeTab === 'audio' ? 'active' : ''} onClick={() => setActiveTab(activeTab === 'audio' ? null : 'audio')}>🎵 Audio</button>
          )}
        </aside>

        {/* Left Tabs Drawer Panel */}
        {activeTab && (
          <section className="editor-tab-panel">
            <button className="panel-close-btn" onClick={() => setActiveTab(null)}>✕ Close Panel</button>
            
            {activeTab === 'layers' && (
              <div className="panel-content layers-panel">
                <h2>Layers Manager</h2>
                <div className="layer-list">
                  {[...layers].reverse().map((layer) => (
                    <div key={layer.id} className={`layer-item ${activeLayerId === layer.id ? 'active' : ''} ${layer.locked ? 'locked' : ''}`} onClick={() => setActiveLayerId(layer.id)}>
                      <span className="layer-type-icon">
                        {layer.type === 'background' ? '🖼️' : layer.type === 'text' ? '🔤' : '📷'}
                      </span>
                      <span className="layer-name">{layer.name}</span>
                      <div className="layer-actions">
                        <button 
                          onPointerDown={stopGesturePropagation}
                          onTouchStart={stopGesturePropagation}
                          onMouseDown={stopGesturePropagation}
                          onClick={(e) => handleLayerActionButtonClick(e, layer.id, () => updateLayerProperties(layer.id, { hidden: !layer.hidden }))}
                        >
                          {layer.hidden ? '👁️‍🗨️' : '👁️'}
                        </button>
                        <button 
                          onPointerDown={stopGesturePropagation}
                          onTouchStart={stopGesturePropagation}
                          onMouseDown={stopGesturePropagation}
                          onClick={(e) => handleLayerActionButtonClick(e, layer.id, () => updateLayerProperties(layer.id, { locked: !layer.locked }))}
                        >
                          {layer.locked ? '🔒' : '🔓'}
                        </button>
                        {layer.type !== 'background' && (
                          <>
                            {layer.type === 'text' && (
                              <button 
                                onPointerDown={stopGesturePropagation}
                                onTouchStart={stopGesturePropagation}
                                onMouseDown={stopGesturePropagation}
                                onClick={(e) => handleLayerActionButtonClick(e, layer.id, () => {
                                  setActiveTab(null); // Close panel
                                  focusCanvasMobileTextInput();
                                })}
                                title="Edit text content directly"
                              >
                                ✍️
                              </button>
                            )}
                            <button 
                              onPointerDown={stopGesturePropagation}
                              onTouchStart={stopGesturePropagation}
                              onMouseDown={stopGesturePropagation}
                              onClick={(e) => handleLayerActionButtonClick(e, layer.id, () => adjustLayerOrder(layer.id, 'forward'))}
                              title="Move Up"
                            >
                              ▲
                            </button>
                            <button 
                              onPointerDown={stopGesturePropagation}
                              onTouchStart={stopGesturePropagation}
                              onMouseDown={stopGesturePropagation}
                              onClick={(e) => handleLayerActionButtonClick(e, layer.id, () => adjustLayerOrder(layer.id, 'backward'))}
                              title="Move Down"
                            >
                              ▼
                            </button>
                            <button 
                              onPointerDown={stopGesturePropagation}
                              onTouchStart={stopGesturePropagation}
                              onMouseDown={stopGesturePropagation}
                              onClick={(e) => handleLayerActionButtonClick(e, layer.id, () => bringToFront(layer.id))}
                              title="Bring to Front"
                            >
                              🔝
                            </button>
                            <button 
                              onPointerDown={stopGesturePropagation}
                              onTouchStart={stopGesturePropagation}
                              onMouseDown={stopGesturePropagation}
                              onClick={(e) => handleLayerActionButtonClick(e, layer.id, () => sendToBack(layer.id))}
                              title="Send to Back"
                            >
                              🔚
                            </button>
                            <button 
                              onPointerDown={stopGesturePropagation}
                              onTouchStart={stopGesturePropagation}
                              onMouseDown={stopGesturePropagation}
                              onClick={(e) => handleLayerActionButtonClick(e, layer.id, () => deleteLayer(layer.id))}
                              title="Delete"
                            >
                              🗑️
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'text' && (
              <div className="panel-content text-panel">
                <h2>Text Controls</h2>
                <button className="btn-add-layer" onClick={addTextLayer}>➕ Add Custom Text Box</button>
                
                {activeLayer && activeLayer.type === 'text' && (
                  <div className="text-editor-section" style={{ marginTop: '20px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '15px' }}>
                    <div className="control-group">
                      <label style={{ fontSize: '0.85rem', color: '#a5b4fc', display: 'block', marginBottom: '8px' }}>✍️ Edit Text Content</label>
                      <textarea
                        ref={mobileTextInputRef}
                        value={activeLayer.text}
                        onChange={(e) => updateLayerProperties(activeLayerId, { text: e.target.value })}
                        style={{
                          width: '100%',
                          height: '80px',
                          background: 'rgba(0, 0, 0, 0.25)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '6px',
                          color: '#ffffff',
                          padding: '10px',
                          fontSize: '1rem',
                          fontFamily: activeLayer.fontFamily || 'Outfit',
                          resize: 'none'
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'uploads' && (
              <div className="panel-content uploads-panel">
                <h2>Media Upload</h2>
                <div className="upload-btn-wrapper">
                  <button className="btn-add-layer">📤 Upload Image</button>
                  <input type="file" accept="image/*" onChange={handleImageUpload} />
                </div>
                {template?.type === 'video' && (
                  <div className="upload-btn-wrapper" style={{ marginTop: '8px' }}>
                    <button className="btn-add-layer">🎬 Upload Video</button>
                    <input type="file" accept="video/mp4,video/webm,video/mov,video/avi" onChange={handleImageUpload} />
                  </div>
                )}
                <p className="panel-helper-text">Click Upload to add a photo. Select a layout photo frame to replace it, or upload directly to add a new photo layer!</p>

                {activeLayer && (activeLayer.type === 'image' || activeLayer.type === 'symbol') && activeLayer.originalUrl && (
                  <button type="button" onClick={() => {
                    setCropBox(activeLayer.cropBox || { left: 0, right: 0, top: 0, bottom: 0 });
                    setIsCropModalOpen(true);
                  }} className="btn btn-secondary w-full" style={{ marginTop: '12px', background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', color: '#ffffff', border: 'none', fontWeight: '600' }}>
                    ✂️ Crop / Cutout Selected Photo
                  </button>
                )}
                
                <div className="uploads-gallery">
                  {uploadGallery.map((img) => (
                    <div key={img.id} className="gallery-item" style={{ position: 'relative' }} onClick={() => {
                      const image = new Image();
                      image.crossOrigin = 'anonymous';
                      image.src = img.url;
                      image.onload = () => {
                        const isReplacing = activeLayer && (activeLayer.type === 'image' || activeLayer.type === 'symbol');
                        if (isReplacing) {
                          updateLayerProperties(activeLayerId, { url: img.url, originalUrl: img.url, imageObj: image, cropBox: { left: 0, right: 0, top: 0, bottom: 0 } });
                          saveStateToHistory();
                        } else {
                          const newL = {
                            id: `image-${Date.now()}`,
                            type: 'image',
                            name: `Photo ${layers.filter(l => l.type === 'image').length + 1}`,
                            url: img.url,
                            originalUrl: img.url,
                            cropBox: { left: 0, right: 0, top: 0, bottom: 0 },
                            imageObj: image,
                            x: 200,
                            y: 200,
                            width: 250,
                            height: 250,
                            rotation: 0,
                            opacity: 1,
                            startTime: 0,
                            endTime: template?.type === 'video' ? duration : 0,
                            animation: { type: 'none', duration: 0.5 },
                            locked: false,
                            hidden: false,
                            userEditable: true
                          };
                          const updated = [...layers, newL];
                          setLayers(updated);
                          setActiveLayerId(newL.id);
                          saveStateToHistory(updated);
                        }
                      };
                    }}>
                      <img src={img.url} alt="Uploaded Item" />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setUploadGallery(prev => prev.filter(item => item.id !== img.id));
                        }}
                        style={{
                          position: 'absolute',
                          top: '4px',
                          right: '4px',
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          background: 'rgba(0,0,0,0.6)',
                          border: 'none',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          cursor: 'pointer',
                          lineHeight: 1,
                          padding: 0
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'presets' && (
              <div className="panel-content presets-panel">
                <h2>Design Presets</h2>
                
                {/* Search Bar */}
                <div className="preset-search-container" style={{ marginBottom: '15px' }}>
                  <input
                    type="text"
                    placeholder="Search presets..."
                    value={presetSearch}
                    onChange={(e) => setPresetSearch(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: 'rgba(0, 0, 0, 0.25)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontSize: '0.9rem',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Categories Scroll */}
                <div className="preset-categories-scroll" style={{
                  display: 'flex',
                  gap: '8px',
                  overflowX: 'auto',
                  paddingBottom: '10px',
                  marginBottom: '15px',
                  whiteSpace: 'nowrap',
                  scrollbarWidth: 'none' // Hide scrollbar in Firefox
                }}>
                  <button
                    className={`category-pill ${selectedPresetCategory === 'all' ? 'active' : ''}`}
                    onClick={() => setSelectedPresetCategory('all')}
                    style={{
                      padding: '6px 12px',
                      background: selectedPresetCategory === 'all' ? 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)' : 'rgba(255,255,255,0.06)',
                      border: 'none',
                      borderRadius: '20px',
                      color: '#ffffff',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      transition: 'all 0.2s'
                    }}
                  >
                    All
                  </button>
                  {PRESET_CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      className={`category-pill ${selectedPresetCategory === cat.id ? 'active' : ''}`}
                      onClick={() => setSelectedPresetCategory(cat.id)}
                      style={{
                        padding: '6px 12px',
                        background: selectedPresetCategory === cat.id ? 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)' : 'rgba(255,255,255,0.06)',
                        border: 'none',
                        borderRadius: '20px',
                        color: '#ffffff',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        transition: 'all 0.2s'
                      }}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>

                {/* Grid list */}
                <div className="presets-grid" style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
                  gap: '12px',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  paddingRight: '4px'
                }}>
                  {(() => {
                    const mappedDynamic = dynamicPresets.map(dp => {
                      let cleanUrl = dp.url;
                      if (!cleanUrl.startsWith('http') && !cleanUrl.startsWith('/')) {
                        cleanUrl = `/uploads/${cleanUrl}`;
                      }
                      return {
                        id: dp._id,
                        category: dp.category,
                        name: dp.name,
                        url: cleanUrl
                      };
                    });
                    const allPresets = [...PRESET_ITEMS, ...mappedDynamic];
                    
                    const filtered = allPresets.filter(item => {
                      const matchesCategory = selectedPresetCategory === 'all' || item.category === selectedPresetCategory;
                      const matchesSearch = item.name.toLowerCase().includes(presetSearch.toLowerCase());
                      return matchesCategory && matchesSearch;
                    });

                    if (filtered.length === 0) {
                      return <p style={{ color: 'rgba(255,255,255,0.4)', gridColumn: '1/-1', textAlign: 'center', margin: '20px 0' }}>No presets found.</p>;
                    }

                    return filtered.map(item => (
                      <div
                        key={item.id}
                        className="preset-item"
                        onClick={() => selectPresetSymbol(item.url, item.name, item.category)}
                        style={{
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '8px',
                          padding: '10px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          textAlign: 'center'
                        }}
                      >
                        <div style={{ width: '50px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                          <img
                            src={item.url}
                            alt={item.name}
                            loading="lazy"
                            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                          />
                        </div>
                        <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
                          {item.name}
                        </span>
                      </div>
                    ));
                  })()}
                </div>

                <button className="btn-add-layer" onClick={addShapeLayer} style={{ marginTop: '20px' }}>
                  ➕ Add Rectangle Shape
                </button>
              </div>
            )}

            {activeTab === 'properties' && (
              <div className="panel-content properties-panel-mobile">
                <h2>Properties & Style</h2>
                {renderPropertiesContent()}
              </div>
            )}

            {activeTab === 'audio' && (
              <div className="panel-content audio-panel">
                <h2>Audio Controls</h2>
                
                <div className="control-group">
                  <label>Audio Option</label>
                  <select value={audioOption} onChange={(e) => setAudioOption(e.target.value)}>
                    <option value="keep">Keep Original Video Audio</option>
                    <option value="replace">Replace with Custom Voiceover</option>
                    <option value="mute">Mute Audio Track</option>
                  </select>
                </div>

                {audioOption === 'replace' && (
                  <div className="control-group">
                    <label>Upload Custom Voiceover File</label>
                    <input type="file" accept="audio/*" onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        setCustomAudioFile(file);
                        setCustomAudioUrl(URL.createObjectURL(file));
                      }
                      e.target.value = '';
                    }} />
                    {customAudioUrl && (
                      <audio ref={audioPreviewRef} src={customAudioUrl} controls style={{ width: '100%', marginTop: '10px' }} />
                    )}
                  </div>
                )}

                <div className="control-group">
                  <label>Add Background Music (Optional)</label>
                  <input type="file" accept="audio/*" onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      setBgMusicFile(file);
                      setBgMusicUrl(URL.createObjectURL(file));
                    }
                    e.target.value = '';
                  }} />
                  {bgMusicUrl && (
                    <audio ref={bgMusicPreviewRef} src={bgMusicUrl} controls style={{ width: '100%', marginTop: '10px' }} />
                  )}
                </div>

                {audioOption !== 'mute' && (
                  <div className="control-group">
                    <label>Voiceover/Main Volume ({Math.round(originalVolume * 100)}%)</label>
                    <input type="range" min="0" max="1" step="0.1" value={audioOption === 'keep' ? originalVolume : customAudioVolume} onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (audioOption === 'keep') setOriginalVolume(val);
                      else setCustomAudioVolume(val);
                    }} />
                  </div>
                )}

                {bgMusicUrl && (
                  <div className="control-group">
                    <label>Background Music Volume ({Math.round(bgMusicVolume * 100)}%)</label>
                    <input type="range" min="0" max="1" step="0.1" value={bgMusicVolume} onChange={(e) => setBgMusicVolume(parseFloat(e.target.value))} />
                  </div>
                )}

                <div className="control-group">
                  <label>Trim Audio Range (Start / End seconds)</label>
                  <div className="trim-sliders">
                    <div>
                      <span>Start: {trimStart}s</span>
                      <input type="range" min="0" max={duration} value={trimStart} onChange={(e) => setTrimStart(parseInt(e.target.value))} />
                    </div>
                    <div>
                      <span>End: {trimEnd}s</span>
                      <input type="range" min={trimStart} max={duration} value={trimEnd} onChange={(e) => setTrimEnd(parseInt(e.target.value))} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Center Workspace Canvas view */}
        <section className="editor-workspace">
          <div className="editor-help-tip">
            💡 <strong>Quick Tip:</strong> Click any text or image on the canvas to move, rotate, resize, or delete it!
          </div>
          
          {/* Scaled bounding container to prevent document layout overflow */}
          <div className="canvas-scale-container" style={{
            width: `${(template.config?.canvasWidth || 1080) * zoomScale}px`,
            height: `${(template.config?.canvasHeight || 1080) * zoomScale}px`
          }}>
            <div className="canvas-wrapper" style={{ 
              width: `${template.config?.canvasWidth || 1080}px`,
              height: `${template.config?.canvasHeight || 1080}px`,
              transform: `scale(${zoomScale})` 
            }}>
              {/* Standard Canvas Renderer */}
              <canvas ref={canvasRef} className="render-canvas"></canvas>

              {/* Draggable/Resizable bounding layers - hidden during playback */}
              {!isPlaying && layers.map(layer => {
                if (layer.hidden) return null;
                if (template?.type === 'video') {
                  if (currentTime < layer.startTime || (layer.endTime > 0 && currentTime > layer.endTime)) {
                    return null;
                  }
                }

                const isActive = layer.id === activeLayerId;
                const isEditable = isAdmin() || layer.userEditable !== false;

                return (
                  <div
                    key={layer.id}
                    id={`layer-wrapper-${layer.id}`}
                    className={`layer-interactive-box ${isActive ? 'active' : ''} ${layer.locked ? 'locked' : ''} ${!isEditable ? 'non-editable' : ''}`}
                    style={{
                      left: `${layer.x}px`,
                      top: `${layer.y}px`,
                      width: `${layer.width}px`,
                      height: `${layer.height}px`,
                      transform: `rotate(${layer.rotation}deg)`
                    }}
                    onMouseDown={(e) => handleDragStart(e, layer)}
                    onPointerDown={(e) => handleLayerPointerDown(e, layer)}
                    onPointerMove={handleLayerPointerMove}
                    onPointerUp={handleLayerPointerUp}
                    onPointerCancel={handleLayerPointerUp}
                    onDoubleClick={(e) => {
                      if (layer.type === 'image' || layer.type === 'symbol') {
                        e.stopPropagation();
                        triggerReplacePhoto(layer.id);
                      } else if (layer.type === 'text') {
                        e.stopPropagation();
                        setActiveLayerId(layer.id);
                        focusCanvasMobileTextInput();
                      }
                    }}
                    onContextMenu={(e) => {
                      if (layer.locked) return;
                      handleContextMenu(e, layer.id);
                    }}
                    onTouchStart={(e) => {
                      if (layer.locked) return;
                      // Context menu long-press only (drag handled by pointer events)
                      if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
                      touchTimerRef.current = setTimeout(() => {
                        const touch = e.touches[0];
                        setContextMenu({
                          x: touch.clientX,
                          y: touch.clientY,
                          layerId: layer.id
                        });
                      }, 600);
                    }}
                    onTouchMove={() => {
                      if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
                    }}
                    onTouchEnd={() => {
                      if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
                    }}
                  >
                    {isActive && !layer.locked && isEditable && (
                      <>
                        <div 
                          className="resize-handle bottom-right" 
                          onMouseDown={(e) => handleResizeStart(e, layer)}
                          onPointerDown={(e) => handleResizePointerDown(e, layer)}
                        ></div>
                        <div 
                          className="rotate-handle" 
                          onMouseDown={(e) => handleRotateStart(e, layer)}
                          onPointerDown={(e) => handleRotatePointerDown(e, layer)}
                        ></div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Right Tab Properties Inspector panel */}
        <aside className="editor-properties-bar">
          <h2>Properties</h2>
          {renderPropertiesContent()}
        </aside>
      </div>

      {/* Hidden elements for preloading templates */}
      <div style={{ display: 'none' }}>
        {template?.type === 'video' && (
          <video
            ref={videoRef}
            src={template.fileUrl || template.previewUrl}
            crossOrigin="anonymous"
            loop={false}
            muted={audioOption !== 'keep'}
            playsInline
            onLoadedMetadata={() => {
              if (videoRef.current) {
                const origVideoDur = videoRef.current.duration || 10;
                setDuration(origVideoDur);
                setTrimEnd(origVideoDur);
              }
            }}
          />
        )}
        <input 
          type="file" 
          id="user-photo-upload" 
          accept="image/*,video/*" 
          onChange={handleImageUpload} 
          style={{ display: 'none' }} 
        />
      </div>

      {/* Video timeline bottom track manager */}
      {template?.type === 'video' && (
        <footer className="editor-timeline-track">
          <div className="timeline-header-controls">
            <button className="btn-play-toggle" onClick={() => {
              if (isPlaying) {
                if (videoRef.current) videoRef.current.pause();
                setIsPlaying(false);
              } else {
                setIsPlaying(true);
              }
            }}>
              {isPlaying ? '⏸ Pause' : '▶ Play Preview'}
            </button>
            <div className="timeline-time-info">
              <span>Time: <strong>{currentTime.toFixed(1)}s</strong> / {duration.toFixed(1)}s</span>
            </div>
          </div>

          <div className="timeline-tracks-area">
            {/* Interactive Seek Track Ruler */}
            <div 
              className="timeline-seek-track" 
              style={{
                position: 'relative',
                height: '24px',
                background: '#131924',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                cursor: 'ew-resize',
                marginLeft: '150px',
                width: 'calc(100% - 150px)'
              }}
              onMouseDown={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const handleMouseMove = (moveEvent) => {
                  const x = Math.max(0, Math.min(moveEvent.clientX - rect.left, rect.width));
                  const percentage = x / rect.width;
                  const newTime = percentage * timelineScaleDuration;
                  setCurrentTime(newTime);
                  if (videoRef.current) {
                    const videoDur = videoRef.current.duration || 10;
                    videoRef.current.currentTime = Math.min(newTime, videoDur);
                  }
                };
                const handleMouseUp = () => {
                  window.removeEventListener('mousemove', handleMouseMove);
                  window.removeEventListener('mouseup', handleMouseUp);
                };
                window.addEventListener('mousemove', handleMouseMove);
                window.addEventListener('mouseup', handleMouseUp);
                handleMouseMove(e);
              }}
            >
              <div 
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: `${(currentTime / timelineScaleDuration) * 100}%`,
                  background: 'rgba(99, 102, 241, 0.15)',
                  pointerEvents: 'none'
                }}
              />
              {(() => {
                const ticks = [];
                const step = timelineScaleDuration > 30 ? 5 : 1;
                for (let t = 0; t <= timelineScaleDuration; t += step) {
                  ticks.push(
                    <span 
                      key={t}
                      style={{
                        position: 'absolute',
                        left: `${(t / timelineScaleDuration) * 100}%`,
                        transform: 'translateX(-50%)',
                        fontSize: '9px',
                        color: '#64748b',
                        top: '4px',
                        pointerEvents: 'none'
                      }}
                    >
                      {t}s
                    </span>
                  );
                }
                return ticks;
              })()}
            </div>

            <div className="timeline-playhead-line" style={{ left: `calc(150px + (100% - 150px) * ${currentTime / timelineScaleDuration})` }}></div>

            {layers.filter(l => l.type !== 'background').map(layer => (
              <div key={layer.id} className="timeline-track-row">
                <span 
                  className="track-label" 
                  onClick={() => setActiveLayerId(layer.id)} 
                  style={{ 
                    cursor: 'pointer', 
                    color: activeLayerId === layer.id ? '#818cf8' : '#e2e8f0',
                    fontWeight: activeLayerId === layer.id ? 'bold' : 'normal'
                  }}
                >
                  {layer.name}
                </span>
                <div className="track-bar-container" style={{ position: 'relative', height: '100%', background: 'rgba(255,255,255,0.01)', minHeight: '32px', display: 'flex', alignItems: 'center' }}>
                  <div
                    className="track-duration-bar"
                    style={{
                      position: 'absolute',
                      left: `${(layer.startTime / timelineScaleDuration) * 100}%`,
                      width: `${((layer.endTime - layer.startTime) / timelineScaleDuration) * 100}%`,
                      height: '24px',
                      background: activeLayerId === layer.id ? 'linear-gradient(90deg, #6366f1 0%, #4f46e5 100%)' : '#334155',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'grab',
                      userSelect: 'none',
                      border: activeLayerId === layer.id ? '1px solid #818cf8' : '1px solid rgba(255,255,255,0.1)'
                    }}
                    onMouseDown={(e) => handleTrackDragStart(e, layer)}
                  >
                    <div 
                      className="track-resize-handle left"
                      style={{
                        width: '8px',
                        height: '100%',
                        background: 'rgba(255,255,255,0.3)',
                        borderRadius: '12px 0 0 12px',
                        cursor: 'ew-resize',
                        transition: 'background 0.2s'
                      }}
                      onMouseDown={(e) => handleTrackResizeLeftStart(e, layer)}
                    />
                    <span style={{ fontSize: '10px', color: '#ffffff', pointerEvents: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', padding: '0 4px' }}>
                      {layer.name}
                    </span>
                    <div 
                      className="track-resize-handle right"
                      style={{
                        width: '8px',
                        height: '100%',
                        background: 'rgba(255,255,255,0.3)',
                        borderRadius: '0 12px 12px 0',
                        cursor: 'ew-resize',
                        transition: 'background 0.2s'
                      }}
                      onMouseDown={(e) => handleTrackResizeRightStart(e, layer)}
                     />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </footer>
      )}

      {/* Crop Modal */}
      {isCropModalOpen && activeLayer && activeLayer.originalUrl && (
        <div className="crop-modal-overlay">
          <div className="crop-modal-card">
            <h2>Crop & Adjust Photo</h2>
            
            <div className="crop-canvas-wrapper" style={{ position: 'relative', width: '400px', height: '400px', margin: '0 auto', background: '#090d16', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', overflow: 'hidden' }}>
              <div className="checkerboard-bg" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }} />
              <canvas
                ref={cropCanvasRef}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '400px',
                  height: '400px',
                  zIndex: 1,
                  cursor: 'move'
                }}
                onMouseDown={handleCropCanvasMouseDown}
                onMouseMove={handleCropCanvasMouseMove}
                onMouseUp={handleCropCanvasMouseUp}
                onMouseLeave={handleCropCanvasMouseUp}
                onTouchStart={handleCropCanvasMouseDown}
                onTouchMove={handleCropCanvasMouseMove}
                onTouchEnd={handleCropCanvasMouseUp}
              />
            </div>

            <div className="aspect-ratio-selector" style={{ display: 'flex', gap: '8px', justifyContent: 'center', margin: '5px 0', flexWrap: 'wrap' }}>
              <button type="button" className={`btn-sm ${cropAspectRatio === 'Free' ? 'active' : ''}`} onClick={() => handleSetCropAspectRatio('Free')} style={{ padding: '6px 12px', background: cropAspectRatio === 'Free' ? '#6366f1' : 'rgba(255,255,255,0.05)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', cursor: 'pointer' }}>Free Crop</button>
              <button type="button" className={`btn-sm ${cropAspectRatio === '1:1' ? 'active' : ''}`} onClick={() => handleSetCropAspectRatio('1:1')} style={{ padding: '6px 12px', background: cropAspectRatio === '1:1' ? '#6366f1' : 'rgba(255,255,255,0.05)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', cursor: 'pointer' }}>1:1 (Square)</button>
              <button type="button" className={`btn-sm ${cropAspectRatio === '4:5' ? 'active' : ''}`} onClick={() => handleSetCropAspectRatio('4:5')} style={{ padding: '6px 12px', background: cropAspectRatio === '4:5' ? '#6366f1' : 'rgba(255,255,255,0.05)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', cursor: 'pointer' }}>4:5 (Portrait)</button>
              <button type="button" className={`btn-sm ${cropAspectRatio === '16:9' ? 'active' : ''}`} onClick={() => handleSetCropAspectRatio('16:9')} style={{ padding: '6px 12px', background: cropAspectRatio === '16:9' ? '#6366f1' : 'rgba(255,255,255,0.05)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', cursor: 'pointer' }}>16:9 (Landscape)</button>
              <button type="button" className={`btn-sm ${cropAspectRatio === '9:16' ? 'active' : ''}`} onClick={() => handleSetCropAspectRatio('9:16')} style={{ padding: '6px 12px', background: cropAspectRatio === '9:16' ? '#6366f1' : 'rgba(255,255,255,0.05)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', cursor: 'pointer' }}>9:16 (Story)</button>
            </div>

            <div className="crop-sliders-group" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div className="crop-slider-row" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label style={{ minWidth: '100px', color: '#cccccc' }}>Zoom</label>
                <input 
                  type="range" 
                  min="0.1" 
                  max="3.0" 
                  step="0.05"
                  value={cropZoom} 
                  onChange={(e) => setCropZoom(parseFloat(e.target.value))}
                  style={{ flex: 1, cursor: 'pointer' }}
                />
                <span style={{ minWidth: '40px', textAlign: 'right', color: '#ffffff' }}>{Math.round(cropZoom * 100)}%</span>
              </div>
              
              <div className="crop-slider-row" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label style={{ minWidth: '100px', color: '#cccccc' }}>Rotation</label>
                <input 
                  type="range" 
                  min="-180" 
                  max="180" 
                  step="1"
                  value={cropRotation} 
                  onChange={(e) => setCropRotation(parseInt(e.target.value))}
                  style={{ flex: 1, cursor: 'pointer' }}
                />
                <span style={{ minWidth: '40px', textAlign: 'right', color: '#ffffff' }}>{cropRotation}°</span>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', margin: '5px 0' }}>
                <button type="button" className={`btn btn-secondary btn-sm ${cropFlipH ? 'active' : ''}`} onClick={() => setCropFlipH(!cropFlipH)} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: cropFlipH ? '#6366f1' : 'rgba(255,255,255,0.05)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.1)' }}>
                  ↔️ Flip H
                </button>
                <button type="button" className={`btn btn-secondary btn-sm ${cropFlipV ? 'active' : ''}`} onClick={() => setCropFlipV(!cropFlipV)} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: cropFlipV ? '#6366f1' : 'rgba(255,255,255,0.05)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.1)' }}>
                  ↕️ Flip V
                </button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleFitFillFrame('fit')} style={{ background: 'rgba(255,255,255,0.05)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.1)' }}>
                  🔳 Fit to Frame
                </button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleFitFillFrame('fill')} style={{ background: 'rgba(255,255,255,0.05)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.1)' }}>
                  🔲 Fill Frame
                </button>
              </div>

              <div className="crop-sliders-row-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '6px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', color: '#888' }}>Left Margin</label>
                  <input type="range" min="0" max="90" value={cropBox.left} onChange={(e) => setCropBox(prev => ({ ...prev, left: parseInt(e.target.value) }))} style={{ cursor: 'pointer' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', color: '#888' }}>Right Margin</label>
                  <input type="range" min="0" max="90" value={cropBox.right} onChange={(e) => setCropBox(prev => ({ ...prev, right: parseInt(e.target.value) }))} style={{ cursor: 'pointer' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', color: '#888' }}>Top Margin</label>
                  <input type="range" min="0" max="90" value={cropBox.top} onChange={(e) => setCropBox(prev => ({ ...prev, top: parseInt(e.target.value) }))} style={{ cursor: 'pointer' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', color: '#888' }}>Bottom Margin</label>
                  <input type="range" min="0" max="90" value={cropBox.bottom} onChange={(e) => setCropBox(prev => ({ ...prev, bottom: parseInt(e.target.value) }))} style={{ cursor: 'pointer' }} />
                </div>
              </div>

              {cropBgRemovalEnabled && (
                <div className="chroma-cutout-controls" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px', background: 'rgba(239, 68, 68, 0.05)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.15)', marginTop: '8px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.75rem', color: '#fca5a5' }}>Cutout Color</label>
                    <input type="color" value={cropBgRemovalColor} onChange={(e) => setCropBgRemovalColor(e.target.value)} style={{ cursor: 'pointer', width: '100%', height: '28px', padding: 0, border: 'none', background: 'none' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.75rem', color: '#fca5a5' }}>Tolerance ({cropBgRemovalTolerance})</label>
                    <input type="range" min="5" max="150" value={cropBgRemovalTolerance} onChange={(e) => setCropBgRemovalTolerance(parseInt(e.target.value))} style={{ cursor: 'pointer', flex: 1 }} />
                  </div>
                </div>
              )}
            </div>

            <div className="crop-modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button onClick={handleResetCrop} className="btn btn-secondary" style={{ marginRight: 'auto' }}>
                Reset Crop ↺
              </button>
              <button onClick={() => { setIsCropModalOpen(false); cleanupResizedImages(); }} className="btn btn-secondary">
                Cancel
              </button>
              <button onClick={handleApplyCrop} className="btn btn-primary">
                Apply Crop ✓
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Context Menu Overlay */}
      {contextMenu && (
        <div 
          className="context-menu"
          style={{
            position: 'fixed',
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
            zIndex: 3000
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {(() => {
            const layer = layers.find(l => l.id === contextMenu.layerId);
            if (!layer) return null;
            const isPhoto = layer.type === 'image' || layer.type === 'symbol';
            if (isPhoto) {
              return (
                <>
                  <div className="context-menu-item" onClick={() => { setContextMenu(null); triggerReplacePhoto(layer.id); }}>
                    📷 {language === 'en' ? 'Replace Photo' : 'ఫోటోను మార్చండి'}
                  </div>
                  {layer.originalUrl && (
                    <>
                      <div className="context-menu-item" onClick={() => { setContextMenu(null); setActiveLayerId(layer.id); openCropModal(); }}>
                        ✂️ {language === 'en' ? 'Crop Photo' : 'ఫోటో క్రాప్ చేయండి'}
                      </div>
                      <div className="context-menu-item" onClick={() => { setContextMenu(null); setActiveLayerId(layer.id); handleRemoveBackground(); }}>
                        ✨ {language === 'en' ? 'Remove Background' : 'బ్యాక్‌గ్రౌండ్ తొలగించండి'}
                      </div>
                    </>
                  )}
                  <div className="context-menu-item" onClick={() => { setContextMenu(null); bringToFront(layer.id); }}>
                    🔝 {language === 'en' ? 'Bring to Front' : 'ముందుకు తీసుకురండి'}
                  </div>
                  <div className="context-menu-item" onClick={() => { setContextMenu(null); sendToBack(layer.id); }}>
                    🔚 {language === 'en' ? 'Send to Back' : 'వెనుకకు పంపండి'}
                  </div>
                  <div className="context-menu-item" onClick={() => { setContextMenu(null); duplicateLayer(layer.id); }}>
                    📋 {language === 'en' ? 'Duplicate Photo' : 'ఫోటో నకలు చేయండి'}
                  </div>
                  <div className="context-menu-item delete" onClick={() => { setContextMenu(null); deleteLayer(layer.id); }}>
                    🗑️ {language === 'en' ? 'Delete Layer' : 'లేయర్‌ను తొలగించండి'}
                  </div>
                </>
              );
            } else {
              return (
                <>
                  <div className="context-menu-item" onClick={() => { setContextMenu(null); bringToFront(layer.id); }}>
                    🔝 {language === 'en' ? 'Bring to Front' : 'ముందుకు తీసుకురండి'}
                  </div>
                  <div className="context-menu-item" onClick={() => { setContextMenu(null); sendToBack(layer.id); }}>
                    🔚 {language === 'en' ? 'Send to Back' : 'వెనుకకు పంపండి'}
                  </div>
                  <div className="context-menu-item" onClick={() => { setContextMenu(null); duplicateLayer(layer.id); }}>
                    📋 {language === 'en' ? 'Duplicate Layer' : 'లేయర్ నకలు చేయండి'}
                  </div>
                  <div className="context-menu-item delete" onClick={() => { setContextMenu(null); deleteLayer(layer.id); }}>
                    🗑️ {language === 'en' ? 'Delete Layer' : 'లేయర్‌ను తొలగించండి'}
                  </div>
                </>
              );
            }
          })()}
        </div>
      )}

      {/* Hidden textarea for direct mobile text editing on canvas */}
      <textarea
        ref={canvasMobileTextInputRef}
        value={activeLayer && activeLayer.type === 'text' ? activeLayer.text : ''}
        onChange={(e) => {
          if (activeLayerId) {
            updateLayerProperties(activeLayerId, { text: e.target.value });
          }
        }}
        disabled={!activeLayer || activeLayer.type !== 'text'}
        style={{
          position: 'absolute',
          opacity: 0,
          pointerEvents: 'none',
          width: '1px',
          height: '1px',
          top: '-100px',
          left: '-100px',
          zIndex: -9999
        }}
      />

      {/* Manual Eraser Modal — runs 100% in browser, independent of AI */}
      <ManualEraserModal
        isOpen={isEraserModalOpen}
        imageUrl={activeLayer?.url || (activeLayer?.imageObj?.src) || ''}
        onApply={(transparentDataUrl) => {
          if (activeLayerId && transparentDataUrl) {
            const processedImg = new Image();
            processedImg.crossOrigin = 'anonymous';
            processedImg.onload = () => {
              updateLayerProperties(activeLayerId, {
                url: transparentDataUrl,
                originalUrl: transparentDataUrl,
                imageObj: processedImg
              });
              saveStateToHistory();
              cleanupResizedImages();
            };
            processedImg.src = transparentDataUrl;
          }
          setIsEraserModalOpen(false);
        }}
        onCancel={() => {
          setIsEraserModalOpen(false);
          cleanupResizedImages();
        }}
      />

      {/* Optimization Preprocessing Loading Indicator */}
      {isPreprocessingImage && (
        <div className="preprocessing-loader" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(10, 12, 16, 0.85)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100000,
          backdropFilter: 'blur(6px)'
        }}>
          <div className="loader" style={{ marginBottom: '15px' }} />
          <div style={{ color: '#ffffff', fontSize: '0.95rem', fontWeight: '600', letterSpacing: '0.02em' }}>
            Optimizing Image Bounds...
          </div>
        </div>
      )}
    </div>
  );
}
