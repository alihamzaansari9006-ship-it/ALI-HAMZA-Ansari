import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { LogOut, ShoppingCart, ListOrdered, Package, Search, Eye, Copy, Wand2, ArrowLeft, Send, Image, Reply, X, Clipboard, Upload, Maximize2, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import ChatBox from '../components/ChatBox';
import { ImageZoomModal } from '../components/ImageZoomModal';

export default function PMDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('products');
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [settings, setSettings] = useState<any>({});
  
  // View States
  const [viewingOrder, setViewingOrder] = useState<any>(null);
  const [viewingProduct, setViewingProduct] = useState<any>(null);
  const [prefilledProduct, setPrefilledProduct] = useState<any>(null);

  // AI Edit State
  const [isEditingImage, setIsEditingImage] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [editingImageTarget, setEditingImageTarget] = useState<'order' | 'summary' | null>(null);
  const [tempImages, setTempImages] = useState({ order: '', summary: '' });
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  const [currentUserData, setCurrentUserData] = useState<any>(null);

  useEffect(() => {
    fetchOrders();
    fetchProducts();
    fetchCurrentUser();
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const res = await fetch('/api/settings');
    const data = await res.json();
    setSettings(data);
  };

  if (settings.maintenance_mode === 'true') {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white">Down for Maintenance</h1>
          <p className="text-zinc-400">
            The portal is currently under maintenance. Please try again later.
          </p>
          {settings.admin_whatsapp && (
            <p className="text-sm text-zinc-500">
              Contact support: <span className="text-indigo-400">{settings.admin_whatsapp}</span>
            </p>
          )}
          <button onClick={logout} className="text-zinc-500 hover:text-white text-sm underline">Logout</button>
        </div>
      </div>
    );
  }

  const fetchCurrentUser = async () => {
    if (!user?.id) return;
    const res = await fetch(`/api/users/${user.id}`);
    const data = await res.json();
    setCurrentUserData(data);
  };

  const markOrdersAsViewed = async () => {
    if (!user?.id) return;
    await fetch(`/api/users/${user.id}/view-orders`, { method: 'PUT' });
    fetchCurrentUser();
  };

  const markProductsAsViewed = async () => {
    if (!user?.id) return;
    await fetch(`/api/users/${user.id}/view-products`, { method: 'PUT' });
    fetchCurrentUser();
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === 'orders') markOrdersAsViewed();
    if (tab === 'products') markProductsAsViewed();
  };

  const newOrdersCount = currentUserData ? orders.filter(o => new Date(o.updated_at || o.created_at) > new Date(currentUserData.last_viewed_orders_at)).length : 0;
  const newProductsCount = currentUserData ? products.filter(p => new Date(p.created_at) > new Date(currentUserData.last_viewed_products_at)).length : 0;

  const fetchOrders = async () => {
    const res = await fetch(`/api/orders?pm_id=${user?.id}`);
    const data = await res.json();
    setOrders(data);
  };

  const fetchProducts = async () => {
    const res = await fetch('/api/products');
    const data = await res.json();
    setProducts(data);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement> | React.ClipboardEvent, type: 'order' | 'summary') => {
    let file: File | null = null;
    
    if ('clipboardData' in e) {
      const items = e.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          file = items[i].getAsFile();
          break;
        }
      }
    } else {
      file = e.target.files?.[0] || null;
    }

    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setTempImages(prev => ({ ...prev, [type]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAIEdit = async () => {
    if (!aiPrompt || !editingImageTarget || !tempImages[editingImageTarget]) return;
    
    const loadingToast = toast.loading('Applying AI magic...');
    try {
      const res = await fetch('/api/ai/edit-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt,
          imageBase64: tempImages[editingImageTarget]
        })
      });
      
      const data = await res.json();
      if (data.success) {
        setTempImages(prev => ({ ...prev, [editingImageTarget]: data.imageUrl }));
        toast.success('Image updated!', { id: loadingToast });
        setIsEditingImage(false);
        setAiPrompt('');
      } else {
        toast.error(data.error || 'Failed to edit image', { id: loadingToast });
      }
    } catch (err) {
      toast.error('An error occurred', { id: loadingToast });
    }
  };

  const handleSubmitOrder = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    
    const orderData = {
      id: uuidv4(),
      pm_id: user?.id,
      order_number: formData.get('order_number'),
      customer_email: formData.get('customer_email'),
      review_type: formData.get('review_type'),
      buyer_profile_link: formData.get('buyer_profile_link'),
      order_picture: tempImages.order,
      summary_picture: tempImages.summary
    };

    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });

    if (res.ok) {
      toast.success('Order submitted successfully');
      setTempImages({ order: '', summary: '' });
      form.reset();
      setPrefilledProduct(null);
      fetchOrders();
      setActiveTab('my-orders');
    }
  };

  const [reviewPastedImage, setReviewPastedImage] = useState<string>('');
  const orderFileRef = useRef<HTMLInputElement>(null);
  const summaryFileRef = useRef<HTMLInputElement>(null);
  const reviewFileRef = useRef<HTMLInputElement>(null);

  const handlePasteClick = async (callback: (base64: string) => void) => {
    try {
      // Check if the Clipboard API is available and not blocked by policy
      if (!navigator.clipboard || !navigator.clipboard.read) {
        throw new Error('Clipboard API not available');
      }
      const items = await navigator.clipboard.read();
      for (const item of items) {
        for (const type of item.types) {
          if (type.startsWith('image/')) {
            const blob = await item.getType(type);
            const reader = new FileReader();
            reader.onload = (e) => {
              callback(e.target?.result as string);
              toast.success('Image pasted successfully!');
            };
            reader.readAsDataURL(blob);
            return;
          }
        }
      }
      toast.error('No image found in clipboard');
    } catch (err: any) {
      console.error('Paste error:', err);
      if (err.name === 'NotAllowedError' || err.message?.includes('blocked')) {
        toast.error('Browser blocked clipboard access. Please use Ctrl+V (or long-press on mobile) to paste directly into the box.');
      } else {
        toast.error('Could not access clipboard. Please use Ctrl+V to paste.');
      }
    }
  };

  const handleUpdateOrder = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const fileInput = formData.get('review_picture') as File;
    let reviewPictureBase64 = reviewPastedImage || viewingOrder.review_picture;
    
    if (fileInput && fileInput.size > 0) {
      const reader = new FileReader();
      reviewPictureBase64 = await new Promise((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(fileInput);
      });
    }

    const updateData = {
      status: formData.get('status'),
      review_picture: reviewPictureBase64,
      customer_email: formData.get('customer_email'),
      buyer_profile_link: formData.get('buyer_profile_link'),
      admin_notes: formData.get('admin_notes')
    };

    const res = await fetch(`/api/orders/${viewingOrder.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });

    if (res.ok) {
      toast.success('Order updated successfully');
      fetchOrders();
      setViewingOrder(null);
      setReviewPastedImage('');
    }
  };

  const downloadImage = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  const copyProductDetails = (product: any) => {
    const text = `Keyword: ${product.keyword}\n\nSold By: ${product.sold_by}\n\nASIN: ${product.asin}\n\nPrice: ${product.price}\n\nProduct ID: ${product.id}\n\nLink: ${product.link || ''}`;
    navigator.clipboard.writeText(text);
    toast.success('Product details copied to clipboard');
  };

  const filteredOrders = orders.filter((o: any) => 
    o.customer_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredProducts = products.filter((p: any) => 
    p.status !== 'disabled' && (
      p.keyword.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.country && p.country.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  );

  return (
    <div className="h-screen bg-zinc-950 text-white flex flex-col md:flex-row overflow-hidden">
      {/* Sidebar */}
      <div className="w-full md:w-64 bg-zinc-900/50 border-r border-white/5 flex flex-col flex-shrink-0 overflow-y-auto md:h-full max-h-48 md:max-h-full">
        <div className="p-6 border-b border-white/5">
          <h1 className="text-xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent mb-4">
            {settings.portal_name || 'Prime Dashboard'}
          </h1>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-xl font-bold shadow-lg shadow-indigo-500/20">
                {user?.name.charAt(0)}
              </div>
              <div>
                <h2 className="font-semibold text-sm">{user?.name}</h2>
                <p className="text-xs text-zinc-400 capitalize">Proxy Marketer</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="md:hidden p-2 text-red-400 hover:bg-red-400/10 rounded-xl transition-colors"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>

        {settings.admin_whatsapp && (
          <div className="px-4 py-2">
            <a 
              href={`https://wa.me/${settings.admin_whatsapp.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm hover:bg-emerald-500/20 transition-colors"
            >
              <Reply size={18} />
              Contact Admin
            </a>
          </div>
        )}

        <nav className="flex-1 p-4 space-y-2 flex md:flex-col overflow-x-auto md:overflow-visible">
          <button
            onClick={() => { handleTabChange('products'); setViewingProduct(null); setViewingOrder(null); }}
            className={`flex-shrink-0 md:w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'products' ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
          >
            <div className="flex items-center gap-3">
              <Package size={18} />
              Products
            </div>
            {newProductsCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {newProductsCount}
              </span>
            )}
          </button>
          <button
            onClick={() => { handleTabChange('submit-order'); setViewingProduct(null); setViewingOrder(null); }}
            className={`flex-shrink-0 md:w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'submit-order' ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
          >
            <ShoppingCart size={18} />
            Submit Order
          </button>
          <button
            onClick={() => { handleTabChange('my-orders'); setViewingProduct(null); setViewingOrder(null); }}
            className={`flex-shrink-0 md:w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'my-orders' ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
          >
            <div className="flex items-center gap-3">
              <ListOrdered size={18} />
              My Orders
            </div>
            {newOrdersCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {newOrdersCount}
              </span>
            )}
          </button>
          {settings.pm_guidelines && (
            <button
              onClick={() => { handleTabChange('guidelines'); setViewingProduct(null); setViewingOrder(null); }}
              className={`flex-shrink-0 md:w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'guidelines' ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
            >
              <BookOpen size={18} />
              Guidelines
            </button>
          )}
        </nav>

        <div className="p-4 border-t border-white/5 hidden md:block">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-400/10 transition-colors"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 md:p-8 overflow-auto relative">
        {settings.announcement && (
          <div className="max-w-4xl mx-auto mb-8 bg-indigo-600/10 border border-indigo-500/20 px-6 py-4 rounded-2xl flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 flex-shrink-0">
              <Wand2 size={20} />
            </div>
            <div>
              <p className="text-sm text-indigo-200 font-medium">{settings.announcement}</p>
            </div>
          </div>
        )}
        <AnimatePresence mode="wait">
          {viewingProduct ? (
            <motion.div
              key="view-product"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-4xl mx-auto"
            >
              <button 
                onClick={() => setViewingProduct(null)}
                className="flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors"
              >
                <ArrowLeft size={16} /> Back to Products
              </button>
              
              <div className="bg-zinc-900/50 border border-white/5 rounded-3xl overflow-hidden flex flex-col md:flex-row">
                <div className="md:w-1/2 bg-black/20 p-8 flex items-center justify-center">
                  {viewingProduct.picture ? (
                    <div className="relative group cursor-pointer" onClick={() => setZoomImage(viewingProduct.picture)}>
                      <img src={viewingProduct.picture} alt={viewingProduct.keyword} className="w-full h-auto rounded-2xl shadow-2xl" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl">
                        <Maximize2 className="text-white" size={32} />
                      </div>
                    </div>
                  ) : (
                    <div className="w-full aspect-square bg-zinc-800 rounded-2xl flex items-center justify-center text-zinc-500">No Image</div>
                  )}
                </div>
                <div className="md:w-1/2 p-8 flex flex-col">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h1 className="text-3xl font-bold mb-2">{viewingProduct.keyword}</h1>
                      <p className="text-2xl text-indigo-400 font-light">{viewingProduct.price}</p>
                    </div>
                    <button 
                      onClick={() => copyProductDetails(viewingProduct)}
                      className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-zinc-300"
                      title="Copy Details"
                    >
                      <Copy size={20} />
                    </button>
                  </div>
                  
                    <div className="space-y-4 flex-1">
                      {viewingProduct.commission && (
                        <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-xl mb-4">
                          <p className="text-xs text-green-500 uppercase tracking-wider mb-1 font-bold">PM Commission</p>
                          <p className="text-2xl font-bold text-green-400">{viewingProduct.commission} PKR</p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                      <div className="bg-black/20 p-4 rounded-xl">
                        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Sold By</p>
                        <p className="font-medium">{viewingProduct.sold_by}</p>
                      </div>
                      <div className="bg-black/20 p-4 rounded-xl">
                        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">ASIN</p>
                        <p className="font-mono">{viewingProduct.asin}</p>
                      </div>
                      <div className="bg-black/20 p-4 rounded-xl">
                        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Country</p>
                        <p className="font-medium">{viewingProduct.country || 'N/A'}</p>
                      </div>
                      <div className="bg-black/20 p-4 rounded-xl">
                        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Condition</p>
                        <p className="font-medium">{viewingProduct.condition || 'N/A'}</p>
                      </div>
                    </div>
                    {viewingProduct.link && (
                      <div className="bg-black/20 p-4 rounded-xl">
                        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Link</p>
                        <a href={viewingProduct.link} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline truncate block">
                          {viewingProduct.link}
                        </a>
                      </div>
                    )}
                  </div>
                  
                  <button 
                    onClick={() => {
                      setPrefilledProduct(viewingProduct);
                      setViewingProduct(null);
                      setActiveTab('submit-order');
                    }}
                    disabled={settings.pause_orders === 'true'}
                    className="w-full mt-8 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl px-4 py-4 font-medium transition-colors text-lg shadow-lg shadow-indigo-500/20"
                  >
                    {settings.pause_orders === 'true' ? 'Orders Temporarily Paused' : 'Order Now'}
                  </button>
                </div>
              </div>
            </motion.div>
          ) : viewingOrder ? (
            <motion.div
              key="view-order"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-4xl mx-auto"
            >
              <button 
                onClick={() => setViewingOrder(null)}
                className="flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors"
              >
                <ArrowLeft size={16} /> Back to Orders
              </button>
              
              <div className="bg-zinc-900/50 border border-white/5 rounded-3xl overflow-hidden p-8">
                <div className="flex justify-between items-center mb-8 pb-6 border-b border-white/5">
                  <div>
                    <h1 className="text-2xl font-bold">Order Details</h1>
                    <p className="text-zinc-400 font-mono mt-1">ID: {viewingOrder.id}</p>
                  </div>
                  <div className={`px-4 py-2 rounded-full text-sm font-medium ${
                    viewingOrder.status === 'ordered' ? 'bg-blue-500/20 text-blue-400' :
                    viewingOrder.status === 'reviewed' ? 'bg-green-500/20 text-green-400' :
                    viewingOrder.status === 'refunded' ? 'bg-purple-500/20 text-purple-400' :
                    viewingOrder.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                    viewingOrder.status === 'on_hold' ? 'bg-yellow-500/20 text-yellow-400' :
                    viewingOrder.status === 'canceled' ? 'bg-red-500/20 text-red-400' :
                    'bg-zinc-500/20 text-zinc-400'
                  }`}>
                    {(viewingOrder.status || '').replace('_', ' ').toUpperCase()}
                  </div>
                </div>

                <form onSubmit={handleUpdateOrder} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Images */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Order Images</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-black/20 rounded-xl p-2">
                          <p className="text-xs text-center mb-2 text-zinc-500">Order Picture</p>
                          {viewingOrder.order_picture ? (
                            <div className="flex flex-col gap-2">
                              <div className="relative group cursor-pointer" onClick={() => setZoomImage(viewingOrder.order_picture)}>
                                <img src={viewingOrder.order_picture} alt="Order" className="w-full aspect-square object-cover rounded-lg" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                                  <Maximize2 className="text-white" size={20} />
                                </div>
                              </div>
                              <button type="button" onClick={() => downloadImage(viewingOrder.order_picture, `order-${viewingOrder.order_number}.png`)} className="text-xs bg-white/10 hover:bg-white/20 text-white py-1.5 rounded-md transition-colors">Download Image</button>
                            </div>
                          ) : <div className="w-full aspect-square bg-zinc-800 rounded-lg" />}
                        </div>
                        <div className="bg-black/20 rounded-xl p-2">
                          <p className="text-xs text-center mb-2 text-zinc-500">Summary Picture</p>
                          {viewingOrder.summary_picture ? (
                            <div className="flex flex-col gap-2">
                              <div className="relative group cursor-pointer" onClick={() => setZoomImage(viewingOrder.summary_picture)}>
                                <img src={viewingOrder.summary_picture} alt="Summary" className="w-full aspect-square object-cover rounded-lg" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                                  <Maximize2 className="text-white" size={20} />
                                </div>
                              </div>
                              <button type="button" onClick={() => downloadImage(viewingOrder.summary_picture, `summary-${viewingOrder.order_number}.png`)} className="text-xs bg-white/10 hover:bg-white/20 text-white py-1.5 rounded-md transition-colors">Download Image</button>
                            </div>
                          ) : <div className="w-full aspect-square bg-zinc-800 rounded-lg" />}
                        </div>
                      </div>
                      
                      <div className="pt-4">
                        <label className="block text-xs font-medium text-zinc-400 mb-3 uppercase tracking-wider">Review Picture</label>
                        
                        {(reviewPastedImage || viewingOrder.review_picture) && (
                          <div className="mb-4 relative group w-32 h-32 cursor-pointer" onClick={() => setZoomImage(reviewPastedImage || viewingOrder.review_picture)}>
                            <img src={reviewPastedImage || viewingOrder.review_picture} alt="Review" className="h-32 w-32 object-cover rounded-xl border border-white/10" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                              <Maximize2 className="text-white" size={20} />
                            </div>
                            {reviewPastedImage && (
                              <button 
                                type="button" 
                                onClick={() => setReviewPastedImage('')}
                                className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X size={12} />
                              </button>
                            )}
                            <button type="button" onClick={() => downloadImage(reviewPastedImage || viewingOrder.review_picture, `review-${viewingOrder.order_number}.png`)} className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] py-1 rounded-b-xl opacity-0 group-hover:opacity-100 transition-opacity">Download</button>
                          </div>
                        )}

                        <div 
                          className="bg-zinc-950/50 border border-white/10 rounded-2xl p-3 space-y-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                          tabIndex={0}
                          onPaste={(e) => {
                            const items = e.clipboardData.items;
                            for (let i = 0; i < items.length; i++) {
                              if (items[i].type.indexOf('image') !== -1) {
                                const blob = items[i].getAsFile();
                                if (blob) {
                                  const reader = new FileReader();
                                  reader.onload = (event) => setReviewPastedImage(event.target?.result as string);
                                  reader.readAsDataURL(blob);
                                }
                              }
                            }
                          }}
                        >
                          <div className="flex gap-2">
                            <button 
                              type="button"
                              onClick={() => handlePasteClick(setReviewPastedImage)}
                              className="flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white py-2.5 rounded-xl transition-colors border border-white/5 text-xs font-medium"
                            >
                              <Clipboard size={14} />
                              Paste
                            </button>
                            <button 
                              type="button"
                              onClick={() => reviewFileRef.current?.click()}
                              className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl transition-colors shadow-lg shadow-indigo-500/20 text-xs font-medium"
                            >
                              <Upload size={14} />
                              Upload
                            </button>
                          </div>
                          <input 
                            type="file" 
                            ref={reviewFileRef}
                            name="review_picture" 
                            accept="image/*" 
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (event) => setReviewPastedImage(event.target?.result as string);
                                reader.readAsDataURL(file);
                              }
                            }}
                            onPaste={(e) => {
                              const items = e.clipboardData.items;
                              for (let i = 0; i < items.length; i++) {
                                if (items[i].type.indexOf('image') !== -1) {
                                  const blob = items[i].getAsFile();
                                  if (blob) {
                                    const reader = new FileReader();
                                    reader.onload = (event) => {
                                      setReviewPastedImage(event.target?.result as string);
                                    };
                                    reader.readAsDataURL(blob);
                                  }
                                }
                              }
                            }}
                            className="hidden" 
                          />
                          <p className="text-[10px] text-zinc-500 text-center">Tip: You can also press Ctrl+V to paste</p>
                        </div>
                      </div>

                      {viewingOrder.refund_picture && (
                        <div className="pt-4">
                          <p className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">Refund Picture (From Admin)</p>
                          <div className="flex flex-col gap-2 max-w-[12rem]">
                            <div className="relative group cursor-pointer" onClick={() => setZoomImage(viewingOrder.refund_picture)}>
                              <img src={viewingOrder.refund_picture} alt="Refund" className="w-full aspect-square object-cover rounded-lg border border-green-500/30" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                                <Maximize2 className="text-white" size={20} />
                              </div>
                            </div>
                            <button type="button" onClick={() => downloadImage(viewingOrder.refund_picture, `refund-${viewingOrder.order_number}.png`)} className="text-xs bg-white/10 hover:bg-white/20 text-white py-1.5 rounded-md transition-colors">Download Image</button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Order Info</h3>
                        <button 
                          type="button"
                          onClick={() => copyToClipboard(`Order Number: ${viewingOrder.order_number}\nCustomer Email: ${viewingOrder.customer_email}`, 'Order details')}
                          className="flex items-center gap-2 text-xs bg-indigo-600/20 text-indigo-400 px-3 py-1.5 rounded-lg hover:bg-indigo-600/30 transition-colors"
                        >
                          <Copy size={14} /> Copy Info
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-zinc-500 mb-1">Order Number</label>
                          <p className="font-mono text-lg">{viewingOrder.order_number}</p>
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-zinc-500 mb-1">Customer Email</label>
                          <input 
                            type="email" 
                            name="customer_email" 
                            defaultValue={viewingOrder.customer_email}
                            className="w-full bg-zinc-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-zinc-500 mb-1">Review Type</label>
                        <p className="bg-black/20 px-4 py-3 rounded-xl text-sm">{viewingOrder.review_type || 'N/A'}</p>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-zinc-500 mb-1">Amazon Buyer Profile Link (Optional)</label>
                        <input 
                          type="url" 
                          name="buyer_profile_link" 
                          defaultValue={viewingOrder.buyer_profile_link}
                          placeholder="https://www.amazon.com/gp/profile/amzn1.account..."
                          className="w-full bg-zinc-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-zinc-500 mb-2">Update Status</label>
                        <select 
                          name="status" 
                          defaultValue={viewingOrder.status}
                          className="w-full bg-zinc-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                        >
                          <option value="ordered">Ordered</option>
                          <option value="reviewed">Reviewed</option>
                          <option value="on_hold">On Hold</option>
                          <option value="canceled">Canceled</option>
                          <option value="fix_problem">Fix Problem</option>
                          {/* Admin only statuses - shown as read-only if current */}
                          {(viewingOrder.status === 'refunded' || viewingOrder.status === 'completed') && (
                            <option value={viewingOrder.status} disabled>
                              {(viewingOrder.status || '').replace('_', ' ').toUpperCase()} (Admin Only)
                            </option>
                          )}
                        </select>
                      </div>

                      {/* Chat Box */}
                      <div className="pt-4 border-t border-white/5">
                        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Order Chat</h3>
                        <ChatBox orderId={viewingOrder.id} user={user} />
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-white/5">
                    <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-4 py-4 font-medium transition-colors text-lg shadow-lg shadow-indigo-500/20">
                      Update Order
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'products' && (
                <div>
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <h1 className="text-3xl font-bold tracking-tight">Available Products</h1>
                    <div className="relative w-full md:w-96">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                      <input 
                        type="text" 
                        placeholder="Search by ID or Keyword..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-zinc-900/50 border border-white/10 rounded-full pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredProducts.map((product: any) => (
                      <div key={product.id} className="bg-zinc-900/50 border border-white/5 rounded-3xl overflow-hidden hover:border-white/10 transition-colors group">
                        <div className="relative h-48 bg-black/20 overflow-hidden cursor-pointer" onClick={() => product.picture && setZoomImage(product.picture)}>
                          {product.picture ? (
                            <img src={product.picture} alt={product.keyword} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-600">No Image</div>
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Maximize2 className="text-white" size={24} />
                          </div>
                          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 to-transparent opacity-60 pointer-events-none" />
                          
                          {product.country && (
                            <div className="absolute top-4 right-4 flex gap-2">
                              {currentUserData && new Date(product.created_at) > new Date(currentUserData.last_viewed_products_at) && (
                                <span className="bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg animate-pulse">
                                  NEW
                                </span>
                              )}
                              <span className="bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                                {product.country}
                              </span>
                            </div>
                          )}
                          {!product.country && currentUserData && new Date(product.created_at) > new Date(currentUserData.last_viewed_products_at) && (
                            <div className="absolute top-4 right-4">
                              <span className="bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg animate-pulse">
                                NEW
                              </span>
                            </div>
                          )}

                          <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                            <span className="bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                              {product.price}
                            </span>
                            {product.commission && (
                              <div className="flex flex-col items-end">
                                <span className="text-[10px] uppercase tracking-wider font-bold text-green-400 drop-shadow-md">Commission</span>
                                <span className="bg-green-500/20 text-green-400 border border-green-500/30 text-xs font-bold px-2 py-0.5 rounded-full shadow-lg backdrop-blur-sm">
                                  {product.commission} PKR
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="p-6">
                          <h3 className="text-xl font-bold mb-1 truncate">{product.keyword}</h3>
                          <p className="text-sm text-zinc-400 mb-4 truncate">Sold by: {product.sold_by}</p>
                          
                          <div className="flex gap-2">
                            <button 
                              onClick={() => setViewingProduct(product)}
                              className="flex-1 bg-white/5 hover:bg-white/10 text-white rounded-xl py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2"
                            >
                              <Eye size={16} /> View Details
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {filteredProducts.length === 0 && (
                      <div className="col-span-full text-center py-20 text-zinc-500">
                        No products found matching your search.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'submit-order' && (
                <div className="max-w-3xl mx-auto">
                  <h1 className="text-3xl font-bold tracking-tight mb-8">Submit New Order</h1>
                  
                  <form onSubmit={handleSubmitOrder} className="bg-zinc-900/50 border border-white/5 p-8 rounded-3xl shadow-2xl space-y-8">
                    {prefilledProduct && (
                      <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4 flex items-center gap-4">
                        {prefilledProduct.picture && (
                          <div className="relative group w-16 h-16 cursor-pointer" onClick={() => setZoomImage(prefilledProduct.picture)}>
                            <img src={prefilledProduct.picture} alt="" className="w-16 h-16 rounded-lg object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                              <Maximize2 className="text-white" size={16} />
                            </div>
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-indigo-400 font-medium uppercase tracking-wider">Ordering Product</p>
                          <p className="font-bold text-lg">{prefilledProduct.keyword}</p>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Image Uploads */}
                      <div className="space-y-6">
                        <div>
                          <div className="flex justify-between items-end mb-2">
                            <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider">Order Picture</label>
                            {tempImages.order && (
                              <button type="button" onClick={() => { setEditingImageTarget('order'); setIsEditingImage(true); }} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                                <Wand2 size={12} /> AI Edit
                              </button>
                            )}
                          </div>
                          
                          <div 
                            className="bg-zinc-950/50 border border-white/10 rounded-2xl p-4 space-y-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                            tabIndex={0}
                            onPaste={(e) => {
                              const items = e.clipboardData.items;
                              for (let i = 0; i < items.length; i++) {
                                if (items[i].type.indexOf('image') !== -1) {
                                  const blob = items[i].getAsFile();
                                  if (blob) {
                                    const reader = new FileReader();
                                    reader.onload = (event) => setTempImages(prev => ({ ...prev, order: event.target?.result as string }));
                                    reader.readAsDataURL(blob);
                                  }
                                }
                              }
                            }}
                          >
                            {tempImages.order && (
                              <div className="relative group rounded-xl overflow-hidden border border-white/10 cursor-pointer" onClick={() => setZoomImage(tempImages.order)}>
                                <img src={tempImages.order} alt="Order" className="w-full aspect-square object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <Maximize2 className="text-white" size={20} />
                                </div>
                                <button 
                                  type="button" 
                                  onClick={(e) => { e.stopPropagation(); setTempImages(prev => ({ ...prev, order: '' })); }}
                                  className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full z-10"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            )}
                            
                            <div className="flex gap-2">
                              <button 
                                type="button"
                                onClick={() => handlePasteClick((base64) => setTempImages(prev => ({ ...prev, order: base64 })))}
                                className="flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white py-2.5 rounded-xl transition-colors border border-white/5 text-xs font-medium"
                              >
                                <Clipboard size={14} />
                                Paste
                              </button>
                              <button 
                                type="button"
                                onClick={() => orderFileRef.current?.click()}
                                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl transition-colors shadow-lg shadow-indigo-500/20 text-xs font-medium"
                              >
                                <Upload size={14} />
                                Upload
                              </button>
                            </div>
                            <input 
                              type="file" 
                              ref={orderFileRef}
                              required={!tempImages.order} 
                              onChange={(e) => handleImageUpload(e, 'order')} 
                              onPaste={(e) => handleImageUpload(e, 'order')}
                              accept="image/*" 
                              className="hidden" 
                            />
                            <p className="text-[10px] text-zinc-500 text-center">Tip: You can also press Ctrl+V to paste</p>
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between items-end mb-2">
                            <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider">Summary Picture</label>
                            {tempImages.summary && (
                              <button type="button" onClick={() => { setEditingImageTarget('summary'); setIsEditingImage(true); }} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                                <Wand2 size={12} /> AI Edit
                              </button>
                            )}
                          </div>

                          <div 
                            className="bg-zinc-950/50 border border-white/10 rounded-2xl p-4 space-y-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                            tabIndex={0}
                            onPaste={(e) => {
                              const items = e.clipboardData.items;
                              for (let i = 0; i < items.length; i++) {
                                if (items[i].type.indexOf('image') !== -1) {
                                  const blob = items[i].getAsFile();
                                  if (blob) {
                                    const reader = new FileReader();
                                    reader.onload = (event) => setTempImages(prev => ({ ...prev, summary: event.target?.result as string }));
                                    reader.readAsDataURL(blob);
                                  }
                                }
                              }
                            }}
                          >
                            {tempImages.summary && (
                              <div className="relative group rounded-xl overflow-hidden border border-white/10 cursor-pointer" onClick={() => setZoomImage(tempImages.summary)}>
                                <img src={tempImages.summary} alt="Summary" className="w-full aspect-square object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <Maximize2 className="text-white" size={20} />
                                </div>
                                <button 
                                  type="button" 
                                  onClick={(e) => { e.stopPropagation(); setTempImages(prev => ({ ...prev, summary: '' })); }}
                                  className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full z-10"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            )}

                            <div className="flex gap-2">
                              <button 
                                type="button"
                                onClick={() => handlePasteClick((base64) => setTempImages(prev => ({ ...prev, summary: base64 })))}
                                className="flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white py-2.5 rounded-xl transition-colors border border-white/5 text-xs font-medium"
                              >
                                <Clipboard size={14} />
                                Paste
                              </button>
                              <button 
                                type="button"
                                onClick={() => summaryFileRef.current?.click()}
                                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl transition-colors shadow-lg shadow-indigo-500/20 text-xs font-medium"
                              >
                                <Upload size={14} />
                                Upload
                              </button>
                            </div>
                            <input 
                              type="file" 
                              ref={summaryFileRef}
                              required={!tempImages.summary} 
                              onChange={(e) => handleImageUpload(e, 'summary')} 
                              onPaste={(e) => handleImageUpload(e, 'summary')}
                              accept="image/*" 
                              className="hidden" 
                            />
                            <p className="text-[10px] text-zinc-500 text-center">Tip: You can also press Ctrl+V to paste</p>
                          </div>
                        </div>
                      </div>

                      {/* Text Details */}
                      <div className="space-y-6">
                        <div>
                          <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">Order Number</label>
                          <input type="text" name="order_number" required className="w-full bg-zinc-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono" placeholder="114-xxxxxxx-xxxxxxx" />
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">Customer Email</label>
                          <input type="email" name="customer_email" required className="w-full bg-zinc-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="customer@example.com" />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">Review Type</label>
                          <textarea name="review_type" required rows={4} className="w-full bg-zinc-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" placeholder="e.g., Picture Review, Text Review, No Review..." />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">Amazon Buyer Profile Link (Optional)</label>
                          <input type="url" name="buyer_profile_link" className="w-full bg-zinc-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="https://www.amazon.com/gp/profile/amzn1.account..." />
                        </div>
                      </div>
                    </div>

                    <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-4 py-4 font-medium transition-colors text-lg shadow-lg shadow-indigo-500/20">
                      Submit Order
                    </button>
                  </form>
                </div>
              )}

              {activeTab === 'my-orders' && (
                <div>
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <h1 className="text-3xl font-bold tracking-tight">My Orders</h1>
                    <div className="relative w-full md:w-96">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                      <input 
                        type="text" 
                        placeholder="Search by Email, Order #, or ID..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-zinc-900/50 border border-white/10 rounded-full pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="bg-zinc-900/50 border border-white/5 rounded-3xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-zinc-900 border-b border-white/5 text-zinc-400">
                          <tr>
                            <th className="px-6 py-4 font-medium">Image</th>
                            <th className="px-6 py-4 font-medium">Order Number</th>
                            <th className="px-6 py-4 font-medium">Customer Email</th>
                            <th className="px-6 py-4 font-medium">Status</th>
                            <th className="px-6 py-4 font-medium text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {filteredOrders.map((order: any) => (
                            <tr key={order.id} className="hover:bg-white/5 transition-colors group">
                              <td className="px-6 py-4">
                                {order.order_picture ? (
                                  <div className="relative group w-12 h-12 cursor-pointer" onClick={() => setZoomImage(order.order_picture)}>
                                    <img src={order.order_picture} alt="Order" className="w-12 h-12 rounded-lg object-cover border border-white/10" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                                      <Maximize2 className="text-white" size={12} />
                                    </div>
                                  </div>
                                ) : (
                                  <div className="w-12 h-12 rounded-lg bg-zinc-800 border border-white/10" />
                                )}
                              </td>
                              <td className="px-6 py-4 font-mono text-xs flex items-center gap-2">
                                {order.order_number}
                                {currentUserData && new Date(order.updated_at || order.created_at) > new Date(currentUserData.last_viewed_orders_at) && (
                                  <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                                    NEW
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4">{order.customer_email}</td>
                              <td className="px-6 py-4">
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                  order.status === 'ordered' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/20' :
                                  order.status === 'reviewed' ? 'bg-green-500/20 text-green-400 border border-green-500/20' :
                                  order.status === 'on_hold' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/20' :
                                  order.status === 'canceled' ? 'bg-red-500/20 text-red-400 border border-red-500/20' :
                                  'bg-zinc-500/20 text-zinc-400 border border-zinc-500/20'
                                }`}>
                                  {(order.status || '').replace('_', ' ').toUpperCase()}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button 
                                  onClick={() => setViewingOrder(order)}
                                  className="bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                                >
                                  View
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {filteredOrders.length === 0 && (
                        <div className="text-center py-20 text-zinc-500">
                          No orders found.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'guidelines' && settings.pm_guidelines && (
                <div className="max-w-4xl mx-auto">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <h1 className="text-3xl font-bold tracking-tight">PM Guidelines</h1>
                  </div>
                  <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-8 shadow-2xl whitespace-pre-wrap text-zinc-300 leading-relaxed">
                    {settings.pm_guidelines}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* AI Image Editor Modal */}
      <AnimatePresence>
        {isEditingImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-zinc-900 border border-white/10 rounded-3xl p-6 w-full max-w-lg shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Wand2 size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold">AI Image Editor</h2>
                  <p className="text-xs text-zinc-400">Powered by Gemini 2.5 Flash Image</p>
                </div>
              </div>

              <div className="mb-6 rounded-xl overflow-hidden border border-white/10 bg-black/50 relative group cursor-pointer" onClick={() => editingImageTarget && tempImages[editingImageTarget] && setZoomImage(tempImages[editingImageTarget])}>
                {editingImageTarget && tempImages[editingImageTarget] && (
                  <img src={tempImages[editingImageTarget]} alt="To Edit" className="w-full max-h-64 object-contain" />
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Maximize2 className="text-white" size={24} />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">What would you like to change?</label>
                  <input 
                    type="text" 
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="e.g., Add a retro filter, remove background..."
                    className="w-full bg-zinc-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                
                <div className="flex gap-3">
                  <button 
                    onClick={() => setIsEditingImage(false)}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-white rounded-xl py-3 text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleAIEdit}
                    disabled={!aiPrompt}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Wand2 size={16} /> Apply Magic
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <ImageZoomModal 
        isOpen={!!zoomImage} 
        onClose={() => setZoomImage(null)} 
        src={zoomImage || ''} 
      />
    </div>
  );
}
