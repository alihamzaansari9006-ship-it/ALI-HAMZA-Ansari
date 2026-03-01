import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { LogOut, Users, ShoppingBag, PlusCircle, Package, Search, ArrowLeft, Send, Image, Reply, Copy, Check, X, Clipboard, Upload, Maximize2, Settings, Mail, MessageCircle, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import ChatBox from '../components/ChatBox';
import { ImageZoomModal } from '../components/ImageZoomModal';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('orders');
  const [orders, setOrders] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingOrder, setViewingOrder] = useState<any>(null);
  
  const [userTab, setUserTab] = useState('pending');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [viewingUser, setViewingUser] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showAddAdminPassword, setShowAddAdminPassword] = useState(false);
  const [showAddPMPassword, setShowAddPMPassword] = useState(false);

  const [productTab, setProductTab] = useState('enabled');
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [viewingProduct, setViewingProduct] = useState<any>(null);
  const [pastedImage, setPastedImage] = useState<string>('');
  const [editPastedImage, setEditPastedImage] = useState<string>('');
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [settings, setSettings] = useState({ 
    maintenance_mode: 'false', 
    allow_signups: 'true', 
    pause_orders: 'false',
    admin_whatsapp: '',
    portal_name: 'Prime Dashboard',
    announcement: '',
    pm_guidelines: ''
  });

  const filteredOrders = orders.filter((o: any) => 
    (o.customer_email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (o.order_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (o.id || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUsers = users.filter((u: any) => 
    (u.name || '').toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    (u.phone || '').toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  const pendingUsers = filteredUsers.filter((u: any) => u.status === 'pending');
  const approvedUsers = filteredUsers.filter((u: any) => u.status === 'approved' && u.role === 'pm');
  const rejectedUsers = filteredUsers.filter((u: any) => u.status === 'rejected');
  const adminUsers = filteredUsers.filter((u: any) => u.role === 'admin' || u.role === 'owner');

  const filteredProducts = products.filter((p: any) => 
    (p.keyword || '').toLowerCase().includes(productSearchQuery.toLowerCase()) ||
    (p.asin || '').toLowerCase().includes(productSearchQuery.toLowerCase()) ||
    (p.price || '').toLowerCase().includes(productSearchQuery.toLowerCase()) ||
    (p.commission || '').toLowerCase().includes(productSearchQuery.toLowerCase()) ||
    (p.country || '').toLowerCase().includes(productSearchQuery.toLowerCase())
  );

  const enabledProducts = filteredProducts.filter((p: any) => p.status !== 'disabled');
  const disabledProducts = filteredProducts.filter((p: any) => p.status === 'disabled');

  const getUserOrders = (userEmail: string) => {
    const user = users.find((u: any) => u.email === userEmail);
    return orders.filter((o: any) => o.pm_email === userEmail || (user && o.pm_name === user.name));
  };

  const [currentUserData, setCurrentUserData] = useState<any>(null);

  useEffect(() => {
    fetchOrders();
    fetchUsers();
    fetchProducts();
    fetchCurrentUser();
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      setSettings({
        maintenance_mode: data.maintenance_mode || 'false',
        allow_signups: data.allow_signups || 'true',
        pause_orders: data.pause_orders || 'false',
        admin_whatsapp: data.admin_whatsapp || '',
        portal_name: data.portal_name || 'Prime Dashboard',
        announcement: data.announcement || '',
        pm_guidelines: data.pm_guidelines || ''
      });
    } catch (error) {
      console.error('Failed to fetch settings', error);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings })
      });
      if (res.ok) {
        toast.success('Settings saved successfully');
      } else {
        toast.error('Failed to save settings');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

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
    const res = await fetch('/api/orders');
    const data = await res.json();
    setOrders(data);
  };

  const fetchUsers = async () => {
    const res = await fetch('/api/users');
    const data = await res.json();
    setUsers(data);
  };

  const fetchProducts = async () => {
    const res = await fetch('/api/products');
    const data = await res.json();
    setProducts(data);
  };

  const handleApproveUser = async (id: string) => {
    const res = await fetch('/api/users/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    if (res.ok) {
      toast.success('User approved');
      fetchUsers();
    }
  };

  const handleRejectUser = async (id: string) => {
    const res = await fetch('/api/users/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    if (res.ok) {
      toast.success('User rejected');
      fetchUsers();
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

  const handleAddAdmin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const phone = formData.get('phone') as string;

    const res = await fetch('/api/users/add-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: uuidv4(), name, email, password, phone })
    });
    
    if (res.ok) {
      toast.success('Admin added successfully');
      fetchUsers();
      form.reset();
    }
  };

  const handleAddPM = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const phone = formData.get('phone') as string;

    const res = await fetch('/api/users/add-pm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: uuidv4(), name, email, password, phone })
    });
    
    if (res.ok) {
      toast.success('PM added successfully');
      fetchUsers();
      form.reset();
    }
  };

  const handlePasteImage = async (e: React.ClipboardEvent, type: 'add' | 'edit' | 'refund') => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const base64 = event.target?.result as string;
            if (type === 'add') {
              setPastedImage(base64);
            } else {
              setEditPastedImage(base64);
            }
          };
          reader.readAsDataURL(blob);
        }
      }
    }
  };

  const handleAddProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    
    const fileInput = formData.get('picture') as File;
    let pictureBase64 = pastedImage;
    
    if (fileInput && fileInput.size > 0) {
      const reader = new FileReader();
      pictureBase64 = await new Promise((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(fileInput);
      });
    }

    const productData = {
      id: uuidv4(),
      picture: pictureBase64,
      keyword: formData.get('keyword'),
      sold_by: formData.get('sold_by'),
      asin: formData.get('asin'),
      link: formData.get('link'),
      country: formData.get('country'),
      condition: formData.get('condition'),
      price: formData.get('price'),
      commission: formData.get('commission'),
      limit_count: formData.get('limit_count'),
      added_by: user?.id
    };

    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData)
    });

    if (res.ok) {
      toast.success('Product added successfully');
      fetchProducts();
      form.reset();
      setPastedImage('');
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const fileInput = formData.get('picture') as File;
    let pictureBase64 = editPastedImage || viewingProduct.picture;
    
    if (fileInput && fileInput.size > 0) {
      const reader = new FileReader();
      pictureBase64 = await new Promise((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(fileInput);
      });
    }

    const productData = {
      picture: pictureBase64,
      keyword: formData.get('keyword'),
      sold_by: formData.get('sold_by'),
      asin: formData.get('asin'),
      link: formData.get('link'),
      country: formData.get('country'),
      condition: formData.get('condition'),
      price: formData.get('price'),
      commission: formData.get('commission'),
      limit_count: formData.get('limit_count'),
      status: viewingProduct.status
    };

    const res = await fetch(`/api/products/${viewingProduct.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData)
    });

    if (res.ok) {
      toast.success('Product updated successfully');
      fetchProducts();
      setViewingProduct(null);
      setEditPastedImage('');
    }
  };

  const handleToggleProductStatus = async (product: any) => {
    const newStatus = product.status === 'disabled' ? 'enabled' : 'disabled';
    const productData = {
      ...product,
      status: newStatus
    };

    const res = await fetch(`/api/products/${product.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData)
    });

    if (res.ok) {
      toast.success(`Product ${newStatus === 'enabled' ? 'enabled' : 'disabled'} successfully`);
      fetchProducts();
    }
  };

  const [refundPastedImage, setRefundPastedImage] = useState<string>('');
  const addProductFileRef = useRef<HTMLInputElement>(null);
  const editProductFileRef = useRef<HTMLInputElement>(null);
  const refundFileRef = useRef<HTMLInputElement>(null);

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
    
    const fileInput = formData.get('refund_picture') as File;
    let refundPictureBase64 = refundPastedImage || viewingOrder.refund_picture;
    
    if (fileInput && fileInput.size > 0) {
      const reader = new FileReader();
      refundPictureBase64 = await new Promise((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(fileInput);
      });
    }

    const updateData = {
      status: formData.get('status'),
      refund_picture: refundPictureBase64,
      admin_notes: formData.get('admin_notes'),
      buyer_profile_link: formData.get('buyer_profile_link')
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
      setRefundPastedImage('');
    }
  };

  return (
    <div className="h-screen bg-zinc-950 text-white flex flex-col md:flex-row overflow-hidden">
      {/* Sidebar */}
      <div className="w-full md:w-64 bg-zinc-900/50 border-r border-white/5 flex flex-col flex-shrink-0 overflow-y-auto md:h-full max-h-48 md:max-h-full">
        <div className="p-6 border-b border-white/5">
          <h1 className="text-xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent mb-4">
            {settings.portal_name || 'Admin Panel'}
          </h1>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-xl font-bold shadow-lg shadow-indigo-500/20">
                {user?.name.charAt(0)}
              </div>
              <div>
                <h2 className="font-semibold text-sm">{user?.name}</h2>
                <p className="text-xs text-zinc-400 capitalize">{user?.role === 'owner' ? 'Main Owner' : 'Administrator'}</p>
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

        <nav className="flex-1 p-4 space-y-2 flex md:flex-col overflow-x-auto md:overflow-visible">
          <button
            onClick={() => { setActiveTab('orders'); setViewingOrder(null); setViewingUser(null); }}
            className={`flex-shrink-0 md:w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'orders' ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
          >
            <ShoppingBag size={18} />
            All Orders
          </button>
          <button
            onClick={() => { setActiveTab('products'); setViewingOrder(null); setViewingUser(null); }}
            className={`flex-shrink-0 md:w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'products' ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
          >
            <Package size={18} />
            Products
          </button>
          <button
            onClick={() => { setActiveTab('add-product'); setViewingOrder(null); setViewingUser(null); }}
            className={`flex-shrink-0 md:w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'add-product' ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
          >
            <PlusCircle size={18} />
            Add Product
          </button>
          {user?.role === 'owner' && (
            <>
              <button
                onClick={() => { setActiveTab('users'); setViewingOrder(null); setViewingUser(null); }}
                className={`flex-shrink-0 md:w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'users' ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
              >
                <Users size={18} />
                Manage Users
              </button>
              <button
                onClick={() => { setActiveTab('settings'); setViewingOrder(null); setViewingUser(null); }}
                className={`flex-shrink-0 md:w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'settings' ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
              >
                <Settings size={18} />
                Settings
              </button>
            </>
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
      <div className="flex-1 p-4 md:p-8 overflow-auto">
        <AnimatePresence mode="wait">
          {viewingOrder ? (
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
                      
                      {viewingOrder.review_picture && (
                        <div className="pt-4">
                          <p className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">Review Picture (From PM)</p>
                          <div className="flex flex-col gap-2 max-w-[12rem]">
                            <div className="relative group cursor-pointer" onClick={() => setZoomImage(viewingOrder.review_picture)}>
                              <img src={viewingOrder.review_picture} alt="Review" className="w-full aspect-square object-cover rounded-lg" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                                <Maximize2 className="text-white" size={20} />
                              </div>
                            </div>
                            <button type="button" onClick={() => downloadImage(viewingOrder.review_picture, `review-${viewingOrder.order_number}.png`)} className="text-xs bg-white/10 hover:bg-white/20 text-white py-1.5 rounded-md transition-colors">Download Image</button>
                          </div>
                        </div>
                      )}

                      <div className="pt-4">
                        <label className="block text-xs font-medium text-zinc-400 mb-3 uppercase tracking-wider">Refund Picture</label>
                        
                        {(refundPastedImage || viewingOrder.refund_picture) && (
                          <div className="mb-4 relative group w-32 h-32 cursor-pointer" onClick={() => setZoomImage(refundPastedImage || viewingOrder.refund_picture)}>
                            <img src={refundPastedImage || viewingOrder.refund_picture} alt="Refund" className="h-32 w-32 object-cover rounded-xl border border-green-500/30" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                              <Maximize2 className="text-white" size={20} />
                            </div>
                            {(refundPastedImage) && (
                              <button 
                                type="button" 
                                onClick={() => setRefundPastedImage('')}
                                className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X size={12} />
                              </button>
                            )}
                            <button type="button" onClick={() => downloadImage(refundPastedImage || viewingOrder.refund_picture, `refund-${viewingOrder.order_number}.png`)} className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] py-1 rounded-b-xl opacity-0 group-hover:opacity-100 transition-opacity">Download</button>
                          </div>
                        )}

                        <div 
                          className="bg-zinc-950/50 border border-white/10 rounded-2xl p-3 space-y-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                          tabIndex={0}
                          onPaste={(e) => handlePasteImage(e, 'refund')}
                        >
                          <div className="flex gap-2">
                            <button 
                              type="button"
                              onClick={() => handlePasteClick(setRefundPastedImage)}
                              className="flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white py-2.5 rounded-xl transition-colors border border-white/5 text-xs font-medium"
                            >
                              <Clipboard size={14} />
                              Paste
                            </button>
                            <button 
                              type="button"
                              onClick={() => refundFileRef.current?.click()}
                              className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl transition-colors shadow-lg shadow-indigo-500/20 text-xs font-medium"
                            >
                              <Upload size={14} />
                              Upload
                            </button>
                          </div>
                          <input 
                            type="file" 
                            ref={refundFileRef}
                            name="refund_picture" 
                            accept="image/*" 
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (event) => setRefundPastedImage(event.target?.result as string);
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
                                    reader.onload = (event) => setRefundPastedImage(event.target?.result as string);
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
                          <p className="font-medium truncate">{viewingOrder.customer_email}</p>
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
                          <option value="refunded">Refunded</option>
                          <option value="completed">Completed (Commission Paid)</option>
                          <option value="on_hold">On Hold</option>
                          <option value="canceled">Canceled</option>
                          <option value="fix_problem">Fix Problem</option>
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
          {activeTab === 'orders' && (
            <div>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h1 className="text-2xl font-bold">All Orders</h1>
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
              <div className="bg-zinc-900/50 border border-white/5 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-zinc-900 border-b border-white/5 text-zinc-400">
                      <tr>
                        <th className="px-6 py-4 font-medium">Order ID</th>
                        <th className="px-6 py-4 font-medium">PM Name</th>
                        <th className="px-6 py-4 font-medium">Customer Email</th>
                        <th className="px-6 py-4 font-medium">Status</th>
                        <th className="px-6 py-4 font-medium">Date</th>
                        <th className="px-6 py-4 font-medium text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredOrders.map((order: any) => (
                        <tr key={order.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 font-mono text-xs flex items-center gap-2">
                            {order.order_number}
                            {currentUserData && new Date(order.updated_at || order.created_at) > new Date(currentUserData.last_viewed_orders_at) && (
                              <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                                NEW
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <button onClick={() => {
                              const pmUser = users.find((u: any) => u.name === order.pm_name || u.email === order.pm_email);
                              if (pmUser) {
                                if (user?.role === 'owner') {
                                  setViewingUser(pmUser);
                                  setActiveTab('users');
                                } else {
                                  // For Admin, just show name and whatsapp
                                  toast((t) => (
                                    <div className="flex flex-col gap-2">
                                      <p className="font-bold text-zinc-900">{pmUser.name}</p>
                                      <a 
                                        href={`https://wa.me/${(pmUser.phone || '').replace(/[^0-9]/g, '')}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium text-center"
                                        onClick={() => toast.dismiss(t.id)}
                                      >
                                        WhatsApp: {pmUser.phone}
                                      </a>
                                    </div>
                                  ), { duration: 5000 });
                                }
                              }
                            }} className="hover:text-indigo-400 transition-colors underline decoration-white/20 underline-offset-4">
                              {order.pm_name || 'Unknown PM'}
                            </button>
                          </td>
                          <td className="px-6 py-4">{order.customer_email}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              order.status === 'ordered' ? 'bg-blue-500/20 text-blue-400' :
                              order.status === 'reviewed' ? 'bg-green-500/20 text-green-400' :
                              order.status === 'refunded' ? 'bg-purple-500/20 text-purple-400' :
                              order.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                              order.status === 'on_hold' ? 'bg-yellow-500/20 text-yellow-400' :
                              order.status === 'canceled' ? 'bg-red-500/20 text-red-400' :
                              'bg-zinc-500/20 text-zinc-400'
                            }`}>
                              {(order.status || '').replace('_', ' ').toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-zinc-400">{new Date(order.created_at).toLocaleDateString()}</td>
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
                </div>
              </div>
            </div>
          )}

          {activeTab === 'products' && (
            <div className="space-y-8">
              {viewingProduct ? (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="max-w-4xl mx-auto"
                >
                  <button 
                    onClick={() => setViewingProduct(null)}
                    className="flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors"
                  >
                    <ArrowLeft size={16} /> Back to Products
                  </button>
                  
                  <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-8 space-y-8">
                    <div className="flex items-center justify-between border-b border-white/5 pb-6">
                      <div>
                        <h1 className="text-2xl font-bold">Edit Product</h1>
                        <p className="text-zinc-400 font-mono mt-1">ID: {viewingProduct.id}</p>
                      </div>
                      <div className={`px-4 py-2 rounded-full text-sm font-medium ${
                        viewingProduct.status === 'disabled' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
                      }`}>
                        {viewingProduct.status.toUpperCase()}
                      </div>
                    </div>

                    <form onSubmit={handleUpdateProduct} className="space-y-6">
                      <div className="grid grid-cols-2 gap-6">
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-zinc-400 mb-3 uppercase tracking-wider">Product Picture</label>
                          
                          {(editPastedImage || viewingProduct.picture) && (
                            <div className="mb-4 relative group w-32 h-32 cursor-pointer" onClick={() => setZoomImage(editPastedImage || viewingProduct.picture)}>
                              <img src={editPastedImage || viewingProduct.picture} alt="Current" className="h-32 w-32 object-cover rounded-xl border border-white/10" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                                <Maximize2 className="text-white" size={20} />
                              </div>
                              {editPastedImage && (
                                <button 
                                  type="button" 
                                  onClick={() => setEditPastedImage('')}
                                  className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X size={12} />
                                </button>
                              )}
                            </div>
                          )}

                          <div 
                            className="bg-zinc-950/50 border border-white/10 rounded-2xl p-4 space-y-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                            tabIndex={0}
                            onPaste={(e) => handlePasteImage(e, 'edit')}
                          >
                            <div className="flex gap-3">
                              <button 
                                type="button"
                                onClick={() => handlePasteClick(setEditPastedImage)}
                                className="flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl transition-colors border border-white/5 text-sm font-medium"
                              >
                                <Clipboard size={18} />
                                Paste Image
                              </button>
                              <button 
                                type="button"
                                onClick={() => editProductFileRef.current?.click()}
                                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl transition-colors shadow-lg shadow-indigo-500/20 text-sm font-medium"
                              >
                                <Upload size={18} />
                                Upload File
                              </button>
                            </div>
                            <input 
                              type="file" 
                              ref={editProductFileRef}
                              name="picture" 
                              accept="image/*" 
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = (event) => setEditPastedImage(event.target?.result as string);
                                  reader.readAsDataURL(file);
                                }
                              }}
                              onPaste={(e) => handlePasteImage(e, 'edit')}
                              className="hidden" 
                            />
                            <p className="text-[10px] text-zinc-500 text-center">Tip: You can also press Ctrl+V to paste an image</p>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">Keyword</label>
                          <input type="text" name="keyword" defaultValue={viewingProduct.keyword} required className="w-full bg-zinc-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">Sold By</label>
                          <input type="text" name="sold_by" defaultValue={viewingProduct.sold_by} required className="w-full bg-zinc-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">ASIN</label>
                          <input type="text" name="asin" defaultValue={viewingProduct.asin} required className="w-full bg-zinc-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">Price</label>
                          <input type="text" name="price" defaultValue={viewingProduct.price} required className="w-full bg-zinc-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">PM Commission (PKR)</label>
                          <input type="text" name="commission" defaultValue={viewingProduct.commission} placeholder="e.g. 500" className="w-full bg-zinc-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">Order Limit</label>
                          <input type="text" name="limit_count" defaultValue={viewingProduct.limit_count} placeholder="e.g. 2, 3, Unlimited" className="w-full bg-zinc-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">Product Link (Optional)</label>
                          <input type="text" name="link" defaultValue={viewingProduct.link} placeholder="Link or any text..." className="w-full bg-zinc-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">Country</label>
                          <input type="text" name="country" defaultValue={viewingProduct.country} placeholder="USA, UK..." className="w-full bg-zinc-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">Condition / Review Type</label>
                          <input type="text" name="condition" defaultValue={viewingProduct.condition} placeholder="Text Review, Picture Review..." className="w-full bg-zinc-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                      </div>
                      <div className="pt-6 border-t border-white/5 flex gap-4">
                        <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-4 py-4 font-medium transition-colors text-lg shadow-lg shadow-indigo-500/20">
                          Update Product
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleToggleProductStatus(viewingProduct)}
                          className={`flex-1 rounded-xl px-4 py-4 font-medium transition-colors text-lg shadow-lg ${
                            viewingProduct.status === 'disabled' 
                              ? 'bg-green-600 hover:bg-green-500 text-white shadow-green-500/20' 
                              : 'bg-red-600 hover:bg-red-500 text-white shadow-red-500/20'
                          }`}
                        >
                          {viewingProduct.status === 'disabled' ? 'Enable Product' : 'Disable Product'}
                        </button>
                      </div>
                    </form>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <h1 className="text-3xl font-bold tracking-tight">Total Products ({products.length})</h1>
                    <div className="relative w-full md:w-96">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                      <input 
                        type="text" 
                        placeholder="Search by Keyword, ASIN, Country..." 
                        value={productSearchQuery}
                        onChange={(e) => setProductSearchQuery(e.target.value)}
                        className="w-full bg-zinc-900/50 border border-white/10 rounded-full pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 mb-8">
                    <button
                      onClick={() => setProductTab('enabled')}
                      className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
                        productTab === 'enabled' ? 'bg-indigo-600 text-white' : 'bg-white/5 text-zinc-400 hover:bg-white/10'
                      }`}
                    >
                      Enabled ({enabledProducts.length})
                    </button>
                    <button
                      onClick={() => setProductTab('disabled')}
                      className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
                        productTab === 'disabled' ? 'bg-indigo-600 text-white' : 'bg-white/5 text-zinc-400 hover:bg-white/10'
                      }`}
                    >
                      Disabled ({disabledProducts.length})
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {(productTab === 'enabled' ? enabledProducts : disabledProducts).map((product: any) => (
                      <div key={product.id} className="bg-zinc-900/50 border border-white/5 rounded-2xl p-4 flex flex-col gap-4">
                        <div className="relative group cursor-pointer" onClick={() => product.picture && setZoomImage(product.picture)}>
                          {product.picture ? (
                            <img src={product.picture} alt={product.keyword} className="w-full h-48 object-cover rounded-xl" />
                          ) : (
                            <div className="w-full h-48 bg-black/20 rounded-xl flex items-center justify-center text-zinc-600">No Image</div>
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                            <Maximize2 className="text-white" size={24} />
                          </div>
                          {product.country && (
                            <div className="absolute top-2 right-2 flex gap-2">
                              {currentUserData && new Date(product.created_at) > new Date(currentUserData.last_viewed_products_at) && (
                                <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-md animate-pulse">
                                  NEW
                                </span>
                              )}
                              <span className="bg-black/50 backdrop-blur-md border border-white/10 text-white text-xs font-bold px-2 py-1 rounded-md">
                                {product.country}
                              </span>
                            </div>
                          )}
                          {!product.country && currentUserData && new Date(product.created_at) > new Date(currentUserData.last_viewed_products_at) && (
                            <div className="absolute top-2 right-2">
                              <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-md animate-pulse">
                                NEW
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{product.keyword}</h3>
                          <p className="text-sm text-zinc-400">ASIN: <span className="font-mono">{product.asin}</span></p>
                          <p className="text-sm text-zinc-400">Price: {product.price}</p>
                          {product.limit_count && (
                            <p className="text-sm text-zinc-400 mt-1">Limit: <span className="font-medium text-white">{product.limit_count}</span></p>
                          )}
                          {product.commission && (
                            <p className="text-sm text-zinc-400 mt-1">Commission: <span className="font-medium text-green-400">{product.commission} PKR</span></p>
                          )}
                        </div>
                        <div className="flex gap-2 mt-2">
                          <button 
                            onClick={() => setViewingProduct(product)}
                            className="flex-1 bg-white/5 hover:bg-white/10 text-white rounded-xl py-2 text-sm font-medium transition-colors"
                          >
                            View
                          </button>
                          <button 
                            onClick={() => handleToggleProductStatus(product)}
                            className={`flex-1 rounded-xl py-2 text-sm font-medium transition-colors ${
                              product.status === 'disabled' 
                                ? 'bg-green-500/20 hover:bg-green-500/30 text-green-400' 
                                : 'bg-red-500/20 hover:bg-red-500/30 text-red-400'
                            }`}
                          >
                            {product.status === 'disabled' ? 'Enable' : 'Disable'}
                          </button>
                        </div>
                      </div>
                    ))}
                    {(productTab === 'enabled' ? enabledProducts : disabledProducts).length === 0 && (
                      <div className="col-span-full text-center py-20 text-zinc-500">
                        No products found in this category.
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          )}

          {activeTab === 'add-product' && (
            <div className="max-w-2xl">
              <h1 className="text-2xl font-bold mb-6">Add New Product</h1>
              <form onSubmit={handleAddProduct} className="space-y-6 bg-zinc-900/50 border border-white/5 p-8 rounded-2xl">
                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-zinc-400 mb-3 uppercase tracking-wider">Product Picture</label>
                    
                    {pastedImage && (
                      <div className="mb-4 relative group w-32 h-32 cursor-pointer" onClick={() => setZoomImage(pastedImage)}>
                        <img src={pastedImage} alt="Preview" className="h-32 w-32 object-cover rounded-xl border border-white/10" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                          <Maximize2 className="text-white" size={20} />
                        </div>
                        <button 
                          type="button" 
                          onClick={(e) => { e.stopPropagation(); setPastedImage(''); }}
                          className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full z-10"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )}

                    <div 
                      className="bg-zinc-950/50 border border-white/10 rounded-2xl p-4 space-y-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      tabIndex={0}
                      onPaste={(e) => handlePasteImage(e, 'add')}
                    >
                      <div className="flex gap-3">
                        <button 
                          type="button"
                          onClick={() => handlePasteClick(setPastedImage)}
                          className="flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl transition-colors border border-white/5 text-sm font-medium"
                        >
                          <Clipboard size={18} />
                          Paste Image
                        </button>
                        <button 
                          type="button"
                          onClick={() => addProductFileRef.current?.click()}
                          className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl transition-colors shadow-lg shadow-indigo-500/20 text-sm font-medium"
                        >
                          <Upload size={18} />
                          Upload File
                        </button>
                      </div>
                      <input 
                        type="file" 
                        ref={addProductFileRef}
                        name="picture" 
                        accept="image/*" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => setPastedImage(event.target?.result as string);
                            reader.readAsDataURL(file);
                          }
                        }}
                        onPaste={(e) => handlePasteImage(e, 'add')}
                        className="hidden" 
                      />
                      <p className="text-[10px] text-zinc-500 text-center">Tip: You can also press Ctrl+V to paste an image</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">Keyword</label>
                    <input type="text" name="keyword" required className="w-full bg-zinc-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">Sold By</label>
                    <input type="text" name="sold_by" required className="w-full bg-zinc-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">ASIN</label>
                    <input type="text" name="asin" required className="w-full bg-zinc-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">Price</label>
                    <input type="text" name="price" required className="w-full bg-zinc-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">PM Commission (PKR)</label>
                    <input type="text" name="commission" placeholder="e.g. 500" className="w-full bg-zinc-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">Order Limit</label>
                    <input type="text" name="limit_count" placeholder="e.g. 2, 3, Unlimited" className="w-full bg-zinc-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">Product Link (Optional)</label>
                    <input type="text" name="link" placeholder="Link or any text..." className="w-full bg-zinc-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">Country</label>
                    <input type="text" name="country" placeholder="USA, UK..." className="w-full bg-zinc-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">Condition / Review Type</label>
                    <input type="text" name="condition" placeholder="Text Review, Picture Review..." className="w-full bg-zinc-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>
                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-4 py-3 text-sm font-medium transition-colors">
                  Add Product
                </button>
              </form>
            </div>
          )}

          {activeTab === 'users' && user?.role === 'owner' && (
            <div className="space-y-8">
              {viewingUser ? (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="max-w-4xl mx-auto"
                >
                  <button 
                    onClick={() => setViewingUser(null)}
                    className="flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors"
                  >
                    <ArrowLeft size={16} /> Back to Users
                  </button>
                  
                  <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-8 space-y-8">
                    <div className="flex items-center justify-between border-b border-white/5 pb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center text-2xl font-bold shadow-lg shadow-indigo-500/20">
                          {viewingUser.name.charAt(0)}
                        </div>
                        <div>
                          <h1 className="text-2xl font-bold">{viewingUser.name}</h1>
                          <p className="text-zinc-400 capitalize">{viewingUser.role} • {viewingUser.status}</p>
                        </div>
                      </div>
                      <div className="flex gap-8 text-right">
                        {viewingUser.role === 'admin' && (
                          <div>
                            <p className="text-sm text-zinc-500 uppercase tracking-wider mb-1">Products Added</p>
                            <p className="text-3xl font-light">{products.filter(p => p.added_by === viewingUser.id).length}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-sm text-zinc-500 uppercase tracking-wider mb-1">Total Orders</p>
                          <p className="text-3xl font-light">{getUserOrders(viewingUser.email).length}</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Contact Info</h3>
                        <form 
                          className="bg-black/20 rounded-xl p-4 space-y-3"
                          onSubmit={async (e) => {
                            e.preventDefault();
                            const formData = new FormData(e.currentTarget);
                            const res = await fetch(`/api/users/${viewingUser.id}`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify(Object.fromEntries(formData))
                            });
                            if (res.ok) {
                              toast.success('User updated successfully');
                              fetchUsers();
                              setViewingUser({ ...viewingUser, ...Object.fromEntries(formData) });
                            }
                          }}
                        >
                          <div>
                            <p className="text-xs text-zinc-500 mb-1">Name</p>
                            <input 
                              type="text" 
                              name="name" 
                              defaultValue={viewingUser.name} 
                              className="w-full bg-transparent border-b border-white/10 focus:border-indigo-500 focus:outline-none py-1 font-medium" 
                            />
                          </div>
                          <div>
                            <p className="text-xs text-zinc-500 mb-1">Email</p>
                            <div className="relative">
                              <input 
                                type="email" 
                                name="email" 
                                defaultValue={viewingUser.email} 
                                className="w-full bg-transparent border-b border-white/10 focus:border-indigo-500 focus:outline-none py-1 font-medium pr-8" 
                              />
                              <a 
                                href={`mailto:${viewingUser.email}`}
                                className="absolute right-0 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-indigo-400 transition-colors"
                                title="Send Email"
                              >
                                <Mail size={16} />
                              </a>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-zinc-500 mb-1">Phone / WhatsApp</p>
                            <div className="relative">
                              <input 
                                type="text" 
                                name="phone" 
                                defaultValue={viewingUser.phone} 
                                className="w-full bg-transparent border-b border-white/10 focus:border-indigo-500 focus:outline-none py-1 font-medium text-indigo-400 pr-8" 
                              />
                              <a 
                                href={`https://wa.me/${viewingUser.phone?.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="absolute right-0 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-green-400 transition-colors"
                                title="Open WhatsApp"
                              >
                                <MessageCircle size={16} />
                              </a>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-zinc-500 mb-1">Password</p>
                            <div className="relative">
                              <input 
                                type={showPassword ? "text" : "password"}
                                name="password" 
                                defaultValue={viewingUser.password} 
                                className="w-full bg-transparent border-b border-white/10 focus:border-indigo-500 focus:outline-none py-1 font-mono text-sm pr-8" 
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-0 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                              >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                            </div>
                          </div>
                          <button type="submit" className="w-full bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 py-2 rounded-lg font-medium transition-colors mt-4">
                            Save Changes
                          </button>
                        </form>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Actions</h3>
                        <div className="bg-black/20 rounded-xl p-4 flex flex-col gap-3">
                          {viewingUser.status === 'pending' && (
                            <>
                              <button onClick={() => { handleApproveUser(viewingUser.id); setViewingUser({...viewingUser, status: 'approved'}); }} className="w-full bg-green-500/20 hover:bg-green-500/30 text-green-400 py-2 rounded-lg font-medium transition-colors">Approve User</button>
                              <button onClick={() => { handleRejectUser(viewingUser.id); setViewingUser({...viewingUser, status: 'rejected'}); }} className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-400 py-2 rounded-lg font-medium transition-colors">Reject User</button>
                            </>
                          )}
                          {viewingUser.status === 'approved' && (
                            <button onClick={() => { handleRejectUser(viewingUser.id); setViewingUser({...viewingUser, status: 'rejected'}); }} className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-400 py-2 rounded-lg font-medium transition-colors">Revoke Access (Reject)</button>
                          )}
                          {viewingUser.status === 'rejected' && (
                            <button onClick={() => { handleApproveUser(viewingUser.id); setViewingUser({...viewingUser, status: 'approved'}); }} className="w-full bg-green-500/20 hover:bg-green-500/30 text-green-400 py-2 rounded-lg font-medium transition-colors">Restore Access (Approve)</button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 pt-6 border-t border-white/5">
                      <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Order History</h3>
                      <div className="bg-black/20 rounded-xl overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-black/40 border-b border-white/5 text-zinc-400">
                              <tr>
                                <th className="px-4 py-3 font-medium">Order ID</th>
                                <th className="px-4 py-3 font-medium">Customer Email</th>
                                <th className="px-4 py-3 font-medium">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              {getUserOrders(viewingUser.email).map((order: any) => (
                                <tr key={order.id} className="hover:bg-white/5 transition-colors">
                                  <td className="px-4 py-3 font-mono text-xs flex items-center gap-2">
                                    {order.order_number}
                                    {currentUserData && new Date(order.updated_at || order.created_at) > new Date(currentUserData.last_viewed_orders_at) && (
                                      <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                                        NEW
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3">{order.customer_email}</td>
                                  <td className="px-4 py-3">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                      order.status === 'ordered' ? 'bg-blue-500/20 text-blue-400' :
                                      order.status === 'reviewed' ? 'bg-green-500/20 text-green-400' :
                                      order.status === 'refunded' ? 'bg-purple-500/20 text-purple-400' :
                                      order.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                                      order.status === 'on_hold' ? 'bg-yellow-500/20 text-yellow-400' :
                                      order.status === 'canceled' ? 'bg-red-500/20 text-red-400' :
                                      'bg-zinc-500/20 text-zinc-400'
                                    }`}>
                                      {(order.status || '').replace('_', ' ').toUpperCase()}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                              {getUserOrders(viewingUser.email).length === 0 && (
                                <tr>
                                  <td colSpan={3} className="px-4 py-8 text-center text-zinc-500">No orders found for this user.</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <>
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <h1 className="text-2xl font-bold">Manage Users</h1>
                    <div className="relative w-full md:w-96">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                      <input 
                        type="text" 
                        placeholder="Search by Name, Email, or Phone..." 
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                        className="w-full bg-zinc-900/50 border border-white/10 rounded-full pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 overflow-x-auto pb-2">
                    <button onClick={() => setUserTab('pending')} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${userTab === 'pending' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/20' : 'bg-zinc-900/50 text-zinc-400 border border-white/5 hover:bg-white/5'}`}>
                      Pending Approvals ({pendingUsers.length})
                    </button>
                    <button onClick={() => setUserTab('approved')} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${userTab === 'approved' ? 'bg-green-500/20 text-green-400 border border-green-500/20' : 'bg-zinc-900/50 text-zinc-400 border border-white/5 hover:bg-white/5'}`}>
                      Approved Members ({approvedUsers.length})
                    </button>
                    <button onClick={() => setUserTab('rejected')} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${userTab === 'rejected' ? 'bg-red-500/20 text-red-400 border border-red-500/20' : 'bg-zinc-900/50 text-zinc-400 border border-white/5 hover:bg-white/5'}`}>
                      Rejected Users ({rejectedUsers.length})
                    </button>
                    <button onClick={() => setUserTab('admins')} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${userTab === 'admins' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/20' : 'bg-zinc-900/50 text-zinc-400 border border-white/5 hover:bg-white/5'}`}>
                      Admins ({adminUsers.length})
                    </button>
                  </div>

                  <div className="bg-zinc-900/50 border border-white/5 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-zinc-900 border-b border-white/5 text-zinc-400">
                          <tr>
                            <th className="px-6 py-4 font-medium">Name</th>
                            <th className="px-6 py-4 font-medium">Email</th>
                            <th className="px-6 py-4 font-medium">Phone</th>
                            <th className="px-6 py-4 font-medium">Status</th>
                            <th className="px-6 py-4 font-medium text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {(userTab === 'pending' ? pendingUsers : userTab === 'approved' ? approvedUsers : userTab === 'rejected' ? rejectedUsers : adminUsers).map((u: any) => (
                            <tr key={u.id} className="hover:bg-white/5 transition-colors">
                              <td className="px-6 py-4 font-medium">{u.name}</td>
                              <td className="px-6 py-4 text-zinc-400">{u.email}</td>
                              <td className="px-6 py-4 text-zinc-400">{u.phone}</td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  u.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                                  u.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                                  'bg-yellow-500/20 text-yellow-400'
                                }`}>
                                  {u.status.toUpperCase()}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right space-x-2">
                                {u.status === 'pending' && (
                                  <>
                                    <button onClick={() => handleApproveUser(u.id)} className="bg-green-500/20 hover:bg-green-500/30 text-green-400 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">Approve</button>
                                    <button onClick={() => handleRejectUser(u.id)} className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">Reject</button>
                                  </>
                                )}
                                <button onClick={() => setViewingUser(u)} className="bg-white/5 hover:bg-white/10 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">View Profile</button>
                              </td>
                            </tr>
                          ))}
                          {(userTab === 'pending' ? pendingUsers : userTab === 'approved' ? approvedUsers : userTab === 'rejected' ? rejectedUsers : adminUsers).length === 0 && (
                            <tr>
                              <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">No users found in this category.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {userTab === 'admins' && (
                    <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div className="max-w-xl">
                        <h2 className="text-xl font-bold mb-6">Add New Admin</h2>
                        <form onSubmit={handleAddAdmin} className="bg-zinc-900/50 border border-white/5 p-6 rounded-2xl space-y-4">
                          <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">Admin Name</label>
                            <input type="text" name="name" required className="w-full bg-zinc-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">Admin Email</label>
                            <input type="email" name="email" required className="w-full bg-zinc-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">Phone / WhatsApp</label>
                            <input type="text" name="phone" className="w-full bg-zinc-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">Password</label>
                            <div className="relative">
                              <input 
                                type={showAddAdminPassword ? "text" : "password"} 
                                name="password" 
                                required 
                                className="w-full bg-zinc-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-10" 
                              />
                              <button
                                type="button"
                                onClick={() => setShowAddAdminPassword(!showAddAdminPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                              >
                                {showAddAdminPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                              </button>
                            </div>
                          </div>
                          <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-4 py-3 text-sm font-medium transition-colors">
                            Create Admin
                          </button>
                        </form>
                      </div>

                      <div className="max-w-xl">
                        <h2 className="text-xl font-bold mb-6">Add New PM Manually</h2>
                        <form onSubmit={handleAddPM} className="bg-zinc-900/50 border border-white/5 p-6 rounded-2xl space-y-4">
                          <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">PM Name</label>
                            <input type="text" name="name" required className="w-full bg-zinc-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">PM Email</label>
                            <input type="email" name="email" required className="w-full bg-zinc-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">Phone / WhatsApp</label>
                            <input type="text" name="phone" className="w-full bg-zinc-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">Password</label>
                            <div className="relative">
                              <input 
                                type={showAddPMPassword ? "text" : "password"} 
                                name="password" 
                                required 
                                className="w-full bg-zinc-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-10" 
                              />
                              <button
                                type="button"
                                onClick={() => setShowAddPMPassword(!showAddPMPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                              >
                                {showAddPMPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                              </button>
                            </div>
                          </div>
                          <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-4 py-3 text-sm font-medium transition-colors">
                            Create PM
                          </button>
                        </form>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'settings' && user?.role === 'owner' && (
            <div className="max-w-3xl">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">Portal Settings</h1>
                  <p className="text-zinc-400 mt-1">Control portal behavior and global configurations</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* General Settings */}
                <div className="bg-zinc-900/50 border border-white/5 p-6 rounded-2xl space-y-6">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Settings className="text-indigo-400" />
                    General Configuration
                  </h2>
                  
                  <form onSubmit={handleSaveSettings} className="space-y-6">
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">Portal Name</label>
                      <input 
                        type="text" 
                        value={settings.portal_name}
                        onChange={(e) => setSettings({...settings, portal_name: e.target.value})}
                        placeholder="e.g., Prime Dashboard"
                        className="w-full bg-zinc-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">Support WhatsApp Number</label>
                      <input 
                        type="text" 
                        value={settings.admin_whatsapp}
                        onChange={(e) => setSettings({...settings, admin_whatsapp: e.target.value})}
                        placeholder="e.g., +923001234567"
                        className="w-full bg-zinc-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                      />
                      <p className="text-[10px] text-zinc-500 mt-1">This number will be shown to PMs for support.</p>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">Global Announcement</label>
                      <textarea 
                        value={settings.announcement}
                        onChange={(e) => setSettings({...settings, announcement: e.target.value})}
                        placeholder="e.g., New products added! Check them out."
                        rows={3}
                        className="w-full bg-zinc-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" 
                      />
                      <p className="text-[10px] text-zinc-500 mt-1">This message will be shown at the top of PM dashboards.</p>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">PM Guidelines / Rules</label>
                      <textarea 
                        value={settings.pm_guidelines}
                        onChange={(e) => setSettings({...settings, pm_guidelines: e.target.value})}
                        placeholder="e.g., Payment instructions, order rules, etc."
                        rows={5}
                        className="w-full bg-zinc-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" 
                      />
                      <p className="text-[10px] text-zinc-500 mt-1">These guidelines will be available for PMs to read in their dashboard.</p>
                    </div>

                    <div className="pt-4 border-t border-white/5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Maintenance Mode</p>
                          <p className="text-xs text-zinc-500">Disable portal for all non-admin users.</p>
                        </div>
                        <button 
                          type="button"
                          onClick={() => setSettings({...settings, maintenance_mode: settings.maintenance_mode === 'true' ? 'false' : 'true'})}
                          className={`w-12 h-6 rounded-full transition-colors relative ${settings.maintenance_mode === 'true' ? 'bg-red-600' : 'bg-zinc-700'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.maintenance_mode === 'true' ? 'right-1' : 'left-1'}`} />
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Allow New Signups</p>
                          <p className="text-xs text-zinc-500">Enable or disable the signup page.</p>
                        </div>
                        <button 
                          type="button"
                          onClick={() => setSettings({...settings, allow_signups: settings.allow_signups === 'true' ? 'false' : 'true'})}
                          className={`w-12 h-6 rounded-full transition-colors relative ${settings.allow_signups === 'true' ? 'bg-indigo-600' : 'bg-zinc-700'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.allow_signups === 'true' ? 'right-1' : 'left-1'}`} />
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Pause Order Submissions</p>
                          <p className="text-xs text-zinc-500">Prevent PMs from submitting new orders.</p>
                        </div>
                        <button 
                          type="button"
                          onClick={() => setSettings({...settings, pause_orders: settings.pause_orders === 'true' ? 'false' : 'true'})}
                          className={`w-12 h-6 rounded-full transition-colors relative ${settings.pause_orders === 'true' ? 'bg-yellow-600' : 'bg-zinc-700'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.pause_orders === 'true' ? 'right-1' : 'left-1'}`} />
                        </button>
                      </div>
                    </div>

                    <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-4 py-3 text-sm font-medium transition-colors mt-4 shadow-lg shadow-indigo-500/20">
                      Save All Settings
                    </button>
                  </form>
                </div>

                {/* Info Box */}
                <div className="space-y-6">
                  <div className="bg-indigo-600/10 border border-indigo-500/20 p-6 rounded-2xl">
                    <h3 className="text-indigo-400 font-bold mb-2">How these settings work:</h3>
                    <ul className="text-sm text-zinc-400 space-y-3 list-disc pl-4">
                      <li><span className="text-white font-medium">Maintenance Mode:</span> If enabled, PMs will see a "Down for Maintenance" screen and won't be able to use the portal.</li>
                      <li><span className="text-white font-medium">Allow Signups:</span> If disabled, the signup option will be hidden from the login page.</li>
                      <li><span className="text-white font-medium">Pause Orders:</span> PMs can still log in and see products, but the "Order Now" button will be disabled.</li>
                      <li><span className="text-white font-medium">Portal Name:</span> Changes the title shown on the login page and dashboard.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <ImageZoomModal 
        isOpen={!!zoomImage} 
        onClose={() => setZoomImage(null)} 
        src={zoomImage || ''} 
      />
    </div>
  );
}
