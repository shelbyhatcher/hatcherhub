import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  TrendingUp, 
  Share2, 
  Clock, 
  Filter, 
  DollarSign, 
  Users, 
  MousePointer, 
  ArrowUpRight, 
  Heart, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle,
  Sliders,
  Settings,
  Gift,
  Check,
  Smartphone,
  Mail,
  Home,
  Shield,
  Eye,
  Menu,
  X
} from 'lucide-react';

export default function App() {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // View states: 'home' or 'admin'
  const [currentView, setCurrentView] = useState('home');
  const [mobileMenuOpen, setMenuOpen] = useState(false);
  
  // Category & Sort states
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortOption, setSortOption] = useState('score');
  
  // Sign-up states
  const [signupForm, setSignupForm] = useState({
    name: '',
    email: '',
    phone: '',
    channel: 'email',
    categories: []
  });
  const [signupSubmitting, setSignupSubmitting] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(null);
  const [signupError, setSignupError] = useState(null);
  
  // Admin stats state
  const [stats, setStats] = useState(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminConfig, setAdminConfig] = useState(null);
  
  // Active copy states (for popups/notifications)
  const [referralCopied, setReferralCopied] = useState(false);
  const [currentReferralUrl, setCurrentReferralUrl] = useState('');

  // Auto-detect route on mount
  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/admin' || window.location.hash === '#admin') {
      setCurrentView('admin');
    } else {
      setCurrentView('home');
    }
  }, []);

  // Fetch active deals
  useEffect(() => {
    fetchDeals();
  }, [selectedCategory, sortOption]);

  // Fetch admin stats when admin view is active
  useEffect(() => {
    if (currentView === 'admin') {
      fetchAdminData();
    }
  }, [currentView]);

  const fetchDeals = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = '/api/deals';
      const params = new URLSearchParams();
      if (selectedCategory && selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }
      if (sortOption) {
        params.append('sort', sortOption);
      }
      
      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setDeals(data.deals);
      } else {
        setError(data.error || 'Failed to fetch deals.');
      }
    } catch (err) {
      console.error('Error fetching deals:', err);
      setError('Could not connect to the server. Please ensure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminData = async () => {
    setAdminLoading(true);
    try {
      // Fetch Stats
      const resStats = await fetch('/api/stats');
      const dataStats = await resStats.json();
      if (dataStats.success) {
        setStats(dataStats.stats);
      }

      // Fetch Config
      const resConfig = await fetch('/api/config');
      const dataConfig = await resConfig.json();
      if (dataConfig.success) {
        setAdminConfig(dataConfig.config);
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setAdminLoading(false);
    }
  };

  // Sign up submission handler
  const handleSignup = async (e) => {
    e.preventDefault();
    setSignupSubmitting(true);
    setSignupSuccess(null);
    setSignupError(null);

    // Validate email/phone
    if (!signupForm.email && !signupForm.phone) {
      setSignupError('Please provide either an email address or a phone number for alerts.');
      setSignupSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(signupForm),
      });

      const data = await res.json();
      if (data.success) {
        setSignupSuccess('Yay! You are officially in the inner circle. Check your inbox for confirmation! 🎉');
        setCurrentReferralUrl(`https://themomdrop.com/signup?ref=${data.subscriberId || 'mom-friend'}`);
        // Reset form
        setSignupForm({
          name: '',
          email: '',
          phone: '',
          channel: 'email',
          categories: []
        });
      } else {
        setSignupError(data.error || 'Subscription failed. Please check your details.');
      }
    } catch (err) {
      console.error('Error subscribing:', err);
      setSignupError('Server error. Please try again later.');
    } finally {
      setSignupSubmitting(false);
    }
  };

  // Toggle category in signup form
  const toggleSignupCategory = (cat) => {
    const current = [...signupForm.categories];
    const index = current.indexOf(cat);
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(cat);
    }
    setSignupForm({ ...signupForm, categories: current });
  };

  // Copy referral link to clipboard
  const copyReferralLink = () => {
    navigator.clipboard.writeText(currentReferralUrl);
    setReferralCopied(true);
    setTimeout(() => setReferralCopied(false), 2000);
  };

  // Share deal to friend
  const shareDeal = (deal) => {
    const text = `OMG, look at this! The ${deal.title} is ${deal.discount_percentage}% off right now on Amazon! Grab it: https://themomdrop.com/api/clicks/track?dealId=${deal.id}&channel=social_share`;
    navigator.clipboard.writeText(text);
    alert(`Copied sharing link to clipboard! Send it to your bestie! 💌\n\n"${text}"`);
  };

  // Get specific category brand colors matching styling instructions
  const getCategoryStyles = (category) => {
    switch (category) {
      case 'luxury-beauty':
        return {
          bg: 'bg-brand-beautyBg',
          text: 'text-brand-beauty',
          border: 'border-brand-beauty/20',
          label: '💄 Luxury Beauty'
        };
      case 'baby-gear':
        return {
          bg: 'bg-brand-babyBg',
          text: 'text-brand-baby',
          border: 'border-brand-baby/20',
          label: '👶 Premium Baby Gear'
        };
      case 'home-organization':
        return {
          bg: 'bg-brand-homeBg',
          text: 'text-brand-home',
          border: 'border-brand-home/20',
          label: '🧺 Home & Organization'
        };
      default:
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-800',
          border: 'border-gray-200',
          label: '🏷️ Deal'
        };
    }
  };

  // Switch paths correctly
  const navigateTo = (view) => {
    setCurrentView(view);
    setMenuOpen(false);
    if (view === 'admin') {
      window.history.pushState(null, '', '/admin');
    } else {
      window.history.pushState(null, '', '/');
    }
  };

  // Main navigation component
  const renderNavbar = () => (
    <nav className="sticky top-0 z-50 bg-white border-b border-brand-coralLight/60 shadow-sm backdrop-blur-md bg-white/95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center cursor-pointer" onClick={() => navigateTo('home')}>
            <span className="text-2xl mr-2">🙋‍♀️</span>
            <span className="font-heading font-black text-2xl tracking-tight text-brand-charcoal">
              THE MOM <span className="text-brand-coral">DROP</span>
            </span>
          </div>

          {/* Desktop links */}
          <div className="hidden md:flex items-center space-x-6">
            <button 
              onClick={() => navigateTo('home')} 
              className={`font-semibold text-sm transition-colors hover:text-brand-coral ${currentView === 'home' ? 'text-brand-coral font-bold' : 'text-brand-charcoal'}`}
            >
              Browse Drops
            </button>
            <button 
              onClick={() => {
                navigateTo('home');
                setTimeout(() => {
                  document.getElementById('signup-section')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }} 
              className="text-brand-charcoal font-semibold text-sm hover:text-brand-coral transition-colors"
            >
              Get Alerts
            </button>
            <button 
              onClick={() => navigateTo('admin')} 
              className={`flex items-center space-x-1 font-semibold text-sm transition-colors hover:text-brand-coral ${currentView === 'admin' ? 'text-brand-coral font-bold' : 'text-brand-charcoal'}`}
            >
              <Shield className="w-4 h-4" />
              <span>Admin Dashboard</span>
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <button 
              onClick={() => setMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-brand-charcoal hover:text-brand-coral focus:outline-none"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu expanded */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-brand-coralLight/50 px-4 pt-2 pb-4 space-y-2">
          <button 
            onClick={() => navigateTo('home')} 
            className="block w-full text-left px-3 py-2 rounded-md text-base font-semibold text-brand-charcoal hover:bg-brand-coralLight hover:text-brand-coral"
          >
            Browse Drops
          </button>
          <button 
            onClick={() => {
              navigateTo('home');
              setMenuOpen(false);
              setTimeout(() => {
                document.getElementById('signup-section')?.scrollIntoView({ behavior: 'smooth' });
              }, 200);
            }} 
            className="block w-full text-left px-3 py-2 rounded-md text-base font-semibold text-brand-charcoal hover:bg-brand-coralLight hover:text-brand-coral"
          >
            Get Alerts
          </button>
          <button 
            onClick={() => navigateTo('admin')} 
            className="flex items-center space-x-2 w-full text-left px-3 py-2 rounded-md text-base font-semibold text-brand-charcoal hover:bg-brand-coralLight hover:text-brand-coral"
          >
            <Shield className="w-4 h-4" />
            <span>Admin Dashboard</span>
          </button>
        </div>
      )}
    </nav>
  );

  // MAIN PUBLIC WEBSITE VIEW
  const renderHomeView = () => {
    // Filter categorized listings to generate the special sections
    // 1. Highest Earners: Deals with highest estimated commission, or sorted by score
    const highestEarners = [...deals]
      .sort((a, b) => b.estimated_commission - a.estimated_commission)
      .slice(0, 3);

    // 2. Dropping Right Now: Live feed of all matching deals
    const liveFeed = deals;

    // 3. Ending Soon: Mock urgency list (e.g. deals with codes or odd reviews or mock expires soon)
    const endingSoon = [...deals]
      .filter(d => d.coupon_code || d.discount_percentage >= 25)
      .slice(0, 3);

    return (
      <div className="pb-16 animate-fade-in">
        
        {/* HERO SECTION */}
        <header className="relative bg-gradient-to-b from-brand-coralLight/40 via-brand-coralLight/20 to-white overflow-hidden py-12 md:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid md:grid-cols-12 gap-8 items-center">
              
              {/* Hero Copy */}
              <div className="md:col-span-7 space-y-6 text-center md:text-left">
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-brand-coral/10 border border-brand-coral/20 text-brand-coral font-bold text-xs uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Your group-chat bestie for deals</span>
                </div>
                
                <h1 className="font-heading font-black text-4xl sm:text-5xl lg:text-6xl text-brand-charcoal leading-tight">
                  Stop overpaying for <span className="text-brand-coral relative">premium mom gear</span>
                </h1>
                
                <p className="text-gray-600 text-lg leading-relaxed max-w-xl mx-auto md:mx-0">
                  We are your 24/7 autonomous deal-finder. We filter out the Amazon noise, surfacing only <span className="font-bold text-brand-charcoal">20%+ off</span> and <span className="font-bold text-brand-charcoal">4★+ rated</span> premium products in baby gear, luxury beauty, and home organization.
                </p>

                {/* Categories badges in Hero */}
                <div className="pt-2">
                  <p className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-3">Browse Categories</p>
                  <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                    <button 
                      onClick={() => {
                        setSelectedCategory('all');
                        document.getElementById('deals-catalog')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className={`px-4 py-2 rounded-full text-xs font-bold border transition-all ${selectedCategory === 'all' ? 'bg-brand-coral text-white border-brand-coral shadow-md' : 'bg-white text-brand-charcoal border-gray-200 hover:border-brand-coral'}`}
                    >
                      🌈 All Drops
                    </button>
                    <button 
                      onClick={() => {
                        setSelectedCategory('luxury-beauty');
                        document.getElementById('deals-catalog')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className={`px-4 py-2 rounded-full text-xs font-bold border transition-all ${selectedCategory === 'luxury-beauty' ? 'bg-brand-beauty text-white border-brand-beauty shadow-md' : 'bg-white text-brand-beauty border-brand-beauty/20 hover:bg-brand-beautyBg'}`}
                    >
                      💄 Luxury Beauty
                    </button>
                    <button 
                      onClick={() => {
                        setSelectedCategory('baby-gear');
                        document.getElementById('deals-catalog')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className={`px-4 py-2 rounded-full text-xs font-bold border transition-all ${selectedCategory === 'baby-gear' ? 'bg-brand-baby text-white border-brand-baby shadow-md' : 'bg-white text-brand-baby border-brand-baby/20 hover:bg-brand-babyBg'}`}
                    >
                      👶 Baby Gear
                    </button>
                    <button 
                      onClick={() => {
                        setSelectedCategory('home-organization');
                        document.getElementById('deals-catalog')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className={`px-4 py-2 rounded-full text-xs font-bold border transition-all ${selectedCategory === 'home-organization' ? 'bg-brand-home text-white border-brand-home shadow-md' : 'bg-white text-brand-home border-brand-home/20 hover:bg-brand-homeBg'}`}
                    >
                      🧺 Home Org
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick SignUp Form Card */}
              <div id="signup-section" className="md:col-span-5">
                <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-brand-coralLight/70 relative">
                  
                  {/* Decorative element */}
                  <div className="absolute -top-3 -right-3 w-12 h-12 bg-brand-coralSoft rounded-full opacity-20 -z-10 animate-pulse"></div>

                  <h3 className="font-heading font-extrabold text-2xl text-brand-charcoal mb-2">
                    Join "The Inner Circle" ☕
                  </h3>
                  <p className="text-sm text-gray-500 mb-6">
                    Get instant text & email alerts on hot price crashes. No spam, only premium brands.
                  </p>

                  {signupSuccess ? (
                    <div className="space-y-4 text-center py-4">
                      <div className="mx-auto w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <h4 className="font-bold text-lg text-brand-charcoal">You're on the list!</h4>
                      <p className="text-sm text-gray-600 px-2">{signupSuccess}</p>
                      
                      {currentReferralUrl && (
                        <div className="mt-6 pt-4 border-t border-gray-100 space-y-3">
                          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">
                            🎁 Refer Mom Friends for VIP Status!
                          </p>
                          <div className="flex rounded-lg border border-brand-coralSoft/60 overflow-hidden bg-brand-coralLight/20 text-xs">
                            <input 
                              type="text" 
                              readOnly 
                              value={currentReferralUrl}
                              className="px-3 py-2 bg-transparent flex-grow outline-none truncate font-mono text-gray-600"
                            />
                            <button 
                              onClick={copyReferralLink}
                              className="bg-brand-coral text-white px-4 py-2 font-bold hover:bg-brand-coral/95 transition-colors"
                            >
                              {referralCopied ? 'Copied!' : 'Copy'}
                            </button>
                          </div>
                          <p className="text-xs text-gray-400">
                            Refer 3 friends to unlock exclusive high-discount VIP beauty alerts.
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <form onSubmit={handleSignup} className="space-y-4">
                      {signupError && (
                        <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs flex items-start space-x-2">
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          <span>{signupError}</span>
                        </div>
                      )}

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">First Name</label>
                        <input 
                          type="text" 
                          placeholder="Bestie Name" 
                          required
                          value={signupForm.name}
                          onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-coral/50 focus:border-brand-coral outline-none text-sm transition-all"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-500 uppercase flex items-center space-x-1">
                            <Mail className="w-3.5 h-3.5" />
                            <span>Email</span>
                          </label>
                          <input 
                            type="email" 
                            placeholder="hello@gmail.com" 
                            value={signupForm.email}
                            onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-coral/50 focus:border-brand-coral outline-none text-sm transition-all"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-500 uppercase flex items-center space-x-1">
                            <Smartphone className="w-3.5 h-3.5" />
                            <span>Phone SMS</span>
                          </label>
                          <input 
                            type="tel" 
                            placeholder="(555) 000-0000" 
                            value={signupForm.phone}
                            onChange={(e) => setSignupForm({ ...signupForm, phone: e.target.value })}
                            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-coral/50 focus:border-brand-coral outline-none text-sm transition-all"
                          />
                        </div>
                      </div>

                      <div className="space-y-2 pt-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Preferred Channels</label>
                        <div className="flex gap-4">
                          <label className="flex items-center space-x-2 text-sm text-brand-charcoal cursor-pointer">
                            <input 
                              type="radio" 
                              name="channel" 
                              checked={signupForm.channel === 'email'}
                              onChange={() => setSignupForm({ ...signupForm, channel: 'email' })}
                              className="text-brand-coral focus:ring-brand-coral"
                            />
                            <span>Email Drops</span>
                          </label>
                          <label className="flex items-center space-x-2 text-sm text-brand-charcoal cursor-pointer">
                            <input 
                              type="radio" 
                              name="channel" 
                              checked={signupForm.channel === 'sms'}
                              onChange={() => setSignupForm({ ...signupForm, channel: 'sms' })}
                              className="text-brand-coral focus:ring-brand-coral"
                            />
                            <span>SMS Flash</span>
                          </label>
                        </div>
                      </div>

                      <div className="space-y-2 pt-1">
                        <label className="text-xs font-bold text-gray-500 uppercase block">Drop Categories</label>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            { id: 'luxury-beauty', label: '💄 Beauty' },
                            { id: 'baby-gear', label: '👶 Baby' },
                            { id: 'home-organization', label: '🧺 Home Org' }
                          ].map(c => {
                            const isSelected = signupForm.categories.includes(c.id);
                            return (
                              <button 
                                key={c.id}
                                type="button"
                                onClick={() => toggleSignupCategory(c.id)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${isSelected ? 'bg-brand-coral text-white border-brand-coral shadow-sm' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-brand-coral'}`}
                              >
                                {c.label} {isSelected && '✓'}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <button 
                        type="submit" 
                        disabled={signupSubmitting}
                        className="w-full bg-brand-coral text-white font-bold py-3 px-4 rounded-xl hover:bg-brand-coral/95 active:scale-[0.99] transition-all shadow-md mt-4 flex items-center justify-center space-x-2 disabled:opacity-50"
                      >
                        {signupSubmitting ? 'Signing up...' : 'Hook me up with the savings! ⚡'}
                      </button>
                    </form>
                  )}
                </div>
              </div>

            </div>
          </div>
        </header>

        {/* HIGHEST EARNERS / HIGHEST COMMISSIONS SECTION */}
        <section className="py-12 bg-brand-coralLight/10 border-y border-brand-coralLight/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center space-x-2.5 mb-8">
              <div className="p-2 bg-brand-coral/10 rounded-full text-brand-coral">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-heading font-black text-3xl text-brand-charcoal">
                  Highest Earners 🚀
                </h2>
                <p className="text-sm text-gray-500">
                  Massive cash drops on premium favorites. High-end products moms are raving about right now.
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {highestEarners.map(deal => {
                const styles = getCategoryStyles(deal.category);
                return (
                  <div key={deal.id} className="bg-white rounded-3xl border border-gray-100 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col group">
                    {/* Image Header with Badge */}
                    <div className="relative pt-[70%] bg-gray-50 overflow-hidden">
                      <img 
                        src={deal.image_url || 'https://images.unsplash.com/photo-1515488042361-404e9250afef?q=80&w=600&auto=format&fit=crop'} 
                        alt={deal.title}
                        className="absolute inset-0 w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500"
                      />
                      <span className={`absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-bold border ${styles.bg} ${styles.text} ${styles.border}`}>
                        {styles.label}
                      </span>
                      <span className="absolute top-4 right-4 bg-brand-coral text-white font-extrabold px-3 py-1 rounded-xl text-sm shadow-md animate-pulse">
                        {deal.discount_percentage}% OFF
                      </span>
                    </div>

                    {/* Deal Contents */}
                    <div className="p-6 flex-grow flex flex-col justify-between">
                      <div className="space-y-3">
                        <h4 className="font-sans font-bold text-lg text-brand-charcoal line-clamp-2 hover:text-brand-coral transition-colors">
                          {deal.title}
                        </h4>
                        
                        {/* Rating Row */}
                        <div className="flex items-center space-x-1 text-sm text-amber-500">
                          <span className="font-bold">{deal.rating}</span>
                          <span>★</span>
                          <span className="text-gray-400">({deal.reviews_count.toLocaleString()} reviews)</span>
                        </div>

                        <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">
                          {deal.description}
                        </p>
                      </div>

                      {/* Pricing & Outbound Button */}
                      <div className="pt-6 mt-4 border-t border-gray-100 space-y-4">
                        <div className="flex justify-between items-baseline">
                          <div className="space-x-2">
                            <span className="text-2xl font-black text-brand-charcoal">${deal.discount_price.toFixed(2)}</span>
                            <span className="text-sm text-gray-400 line-through">${deal.original_price.toFixed(2)}</span>
                          </div>
                          {deal.coupon_code && (
                            <span className="bg-yellow-100 text-yellow-800 text-xs font-mono font-bold px-2 py-1 rounded">
                              Code: {deal.coupon_code}
                            </span>
                          )}
                        </div>

                        {/* CTA buttons */}
                        <div className="flex gap-2">
                          <a 
                            href={`/api/clicks/track?dealId=${deal.id}&channel=web`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-grow bg-brand-coral text-white text-center font-bold py-3 px-4 rounded-xl hover:bg-brand-coral/95 active:scale-[0.98] transition-all flex items-center justify-center space-x-1 shadow-sm"
                          >
                            <span>Snag the Deal ↗</span>
                          </a>
                          <button 
                            onClick={() => shareDeal(deal)}
                            className="p-3 bg-brand-coralLight/50 text-brand-coral rounded-xl hover:bg-brand-coralLight hover:text-brand-coral transition-all"
                            title="Share with a mom friend"
                          >
                            <Share2 className="w-5 h-5" />
                          </button>
                        </div>

                        {/* Share microcopy */}
                        <p className="text-[11px] text-center text-gray-400 font-medium">
                          Share the savings! Send this deal to a mom friend who needs this.
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* FEED CATALOG SECTION */}
        <section id="deals-catalog" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          
          <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-8 pb-4 border-b border-gray-100">
            <div className="mb-4 md:mb-0">
              <h2 className="font-heading font-black text-3xl text-brand-charcoal">
                Dropping Right Now 🔥
              </h2>
              <p className="text-sm text-gray-500">
                Fresh, premium deals scanned and updated 24/7. Filter by categories to find exactly what you need.
              </p>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap gap-2 items-center">
              <div className="flex items-center space-x-2 text-sm text-gray-500 mr-2">
                <Filter className="w-4 h-4" />
                <span>Sort by:</span>
              </div>
              <select 
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-brand-charcoal outline-none focus:ring-2 focus:ring-brand-coral/50"
              >
                <option value="score">💡 Score (Highest Value)</option>
                <option value="discount">🔥 Highest Discount</option>
                <option value="commission">💸 High Commission</option>
                <option value="price_asc">📉 Price: Low to High</option>
                <option value="price_desc">📈 Price: High to Low</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-20 space-y-3">
              <div className="inline-block w-8 h-8 border-4 border-brand-coral border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-500 text-sm font-bold">Scanning Amazon for price crashes...</p>
            </div>
          ) : error ? (
            <div className="text-center py-20 bg-red-50 rounded-3xl p-8 border border-red-100">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="font-bold text-lg text-brand-charcoal mb-2">Oops! Something went wrong</h3>
              <p className="text-sm text-gray-500">{error}</p>
              <button 
                onClick={fetchDeals}
                className="mt-4 px-6 py-2 bg-brand-coral text-white font-bold rounded-xl"
              >
                Try Again
              </button>
            </div>
          ) : liveFeed.length === 0 ? (
            <div className="text-center py-20 bg-gray-50 rounded-3xl p-8">
              <p className="text-gray-500">No active drops found. Check back in a few minutes, we scan continuously!</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {liveFeed.map(deal => {
                const styles = getCategoryStyles(deal.category);
                return (
                  <div key={deal.id} className="bg-white rounded-3xl border border-gray-100 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col group">
                    
                    {/* Badge & Image */}
                    <div className="relative pt-[70%] bg-gray-50 overflow-hidden">
                      <img 
                        src={deal.image_url || 'https://images.unsplash.com/photo-1515488042361-404e9250afef?q=80&w=600&auto=format&fit=crop'} 
                        alt={deal.title}
                        className="absolute inset-0 w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500"
                      />
                      <span className={`absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-bold border ${styles.bg} ${styles.text} ${styles.border}`}>
                        {styles.label}
                      </span>
                      <span className="absolute top-4 right-4 bg-brand-coral text-white font-extrabold px-3 py-1 rounded-xl text-sm shadow-md">
                        {deal.discount_percentage}% OFF
                      </span>
                    </div>

                    {/* Copy */}
                    <div className="p-6 flex-grow flex flex-col justify-between">
                      <div className="space-y-3">
                        <h4 className="font-sans font-bold text-md text-brand-charcoal line-clamp-2 hover:text-brand-coral transition-colors">
                          {deal.title}
                        </h4>
                        
                        <div className="flex items-center space-x-1 text-sm text-amber-500">
                          <span className="font-bold">{deal.rating}</span>
                          <span>★</span>
                          <span className="text-gray-400">({deal.reviews_count.toLocaleString()} reviews)</span>
                        </div>

                        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                          {deal.description}
                        </p>
                      </div>

                      {/* Buy CTAs */}
                      <div className="pt-6 mt-4 border-t border-gray-100 space-y-3">
                        <div className="flex justify-between items-baseline">
                          <div className="space-x-2">
                            <span className="text-xl font-black text-brand-charcoal">${deal.discount_price.toFixed(2)}</span>
                            <span className="text-xs text-gray-400 line-through">${deal.original_price.toFixed(2)}</span>
                          </div>
                          {deal.coupon_code && (
                            <span className="bg-yellow-100 text-yellow-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded">
                              Code: {deal.coupon_code}
                            </span>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <a 
                            href={`/api/clicks/track?dealId=${deal.id}&channel=web`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-grow bg-brand-coral text-white text-center font-bold py-2.5 px-4 rounded-xl hover:bg-brand-coral/95 active:scale-[0.98] transition-all flex items-center justify-center space-x-1 shadow-sm text-sm"
                          >
                            <span>Shop {deal.discount_percentage}% Off ↗</span>
                          </a>
                          <button 
                            onClick={() => shareDeal(deal)}
                            className="p-2.5 bg-brand-coralLight/50 text-brand-coral rounded-xl hover:bg-brand-coralLight hover:text-brand-coral transition-all"
                            title="Share with a mom friend"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ENDING SOON / HIGH URGENCY SECTION */}
        <section className="bg-brand-charcoal text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center space-x-2.5 mb-8">
              <div className="p-2 bg-white/10 rounded-full text-brand-coral">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-heading font-black text-3xl text-white">
                  Ending Soon 🚨
                </h2>
                <p className="text-sm text-gray-400">
                  Don't gatekeep, run! These low prices or promo codes will expire very soon.
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {endingSoon.map(deal => (
                <div key={deal.id} className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col justify-between hover:bg-white/10 transition-all duration-300">
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <span className="bg-brand-coral text-white font-extrabold text-xs px-2.5 py-1 rounded-xl">
                        {deal.discount_percentage}% OFF
                      </span>
                      <span className="text-xs text-brand-coralSoft flex items-center space-x-1">
                        <Clock className="w-3 h-3 animate-spin" />
                        <span className="font-bold">Urgent Drop</span>
                      </span>
                    </div>

                    <h4 className="font-sans font-bold text-md text-white line-clamp-2">
                      {deal.title}
                    </h4>

                    <div className="flex items-baseline space-x-2">
                      <span className="text-2xl font-black text-white">${deal.discount_price.toFixed(2)}</span>
                      <span className="text-xs text-gray-400 line-through">${deal.original_price.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="pt-6 mt-6 border-t border-white/10 space-y-3">
                    <a 
                      href={`/api/clicks/track?dealId=${deal.id}&channel=web`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full bg-brand-coral text-white text-center font-bold py-2.5 rounded-xl hover:bg-brand-coral/95 transition-all text-sm"
                    >
                      Grab it before it sells out ↗
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

      </div>
    );
  };

  // ADMIN DASHBOARD VIEW
  const renderAdminView = () => {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 pb-6 border-b border-gray-200">
          <div>
            <div className="flex items-center space-x-2 text-brand-coral font-bold text-sm mb-1">
              <Shield className="w-4 h-4" />
              <span>Administrative Interface</span>
            </div>
            <h1 className="font-heading font-black text-4xl text-brand-charcoal">
              Platform Metrics & Configuration
            </h1>
          </div>
          
          <button 
            onClick={fetchAdminData}
            className="mt-4 md:mt-0 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-brand-charcoal text-sm font-bold rounded-xl transition-all flex items-center space-x-1"
          >
            <span>Refresh Analytics</span>
          </button>
        </div>

        {adminLoading ? (
          <div className="text-center py-20 space-y-3">
            <div className="inline-block w-8 h-8 border-4 border-brand-coral border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-500 text-sm">Aggregating platform telemetry and click logs...</p>
          </div>
        ) : !stats ? (
          <div className="text-center py-20 bg-gray-50 rounded-3xl">
            <AlertCircle className="w-12 h-12 text-brand-coral mx-auto mb-4" />
            <p className="text-gray-500">Could not retrieve stats. Verify that the backend server is running correctly.</p>
          </div>
        ) : (
          <div className="space-y-8">
            
            {/* KPI METRIC CARDS */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* Active Subscribers */}
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wider font-bold text-gray-400">Active Subscribers</p>
                  <h3 className="text-3xl font-black text-brand-charcoal">{stats.active_subscribers}</h3>
                  <p className="text-xs text-green-500 font-bold">● Live list size</p>
                </div>
                <div className="p-4 bg-brand-coral/10 rounded-2xl text-brand-coral">
                  <Users className="w-6 h-6" />
                </div>
              </div>

              {/* Unsubscribed */}
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wider font-bold text-gray-400">Unsubscribed</p>
                  <h3 className="text-3xl font-black text-brand-charcoal">{stats.unsubscribed}</h3>
                  <p className="text-xs text-red-500 font-bold">● Opt-out counts</p>
                </div>
                <div className="p-4 bg-gray-100 rounded-2xl text-gray-400">
                  <X className="w-6 h-6" />
                </div>
              </div>

              {/* Outbound Clicks */}
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wider font-bold text-gray-400">Outbound Click Events</p>
                  <h3 className="text-3xl font-black text-brand-charcoal">{stats.total_clicks}</h3>
                  <p className="text-xs text-brand-coral font-bold">● Link engagements</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-2xl text-blue-500">
                  <MousePointer className="w-6 h-6" />
                </div>
              </div>

              {/* Total Estimated Commission */}
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wider font-bold text-gray-400">Projected GCI Revenue</p>
                  <h3 className="text-3xl font-black text-green-600">${stats.total_estimated_commission.toFixed(2)}</h3>
                  <p className="text-xs text-green-500 font-bold">● Est. Amazon GCI</p>
                </div>
                <div className="p-4 bg-green-50 rounded-2xl text-green-600">
                  <DollarSign className="w-6 h-6" />
                </div>
              </div>

            </div>

            {/* CHANNEL ANALYTICS & BREAKDOWNS */}
            <div className="grid md:grid-cols-2 gap-8">
              
              {/* Clicks by Marketing Channel */}
              <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
                <h3 className="font-heading font-black text-xl text-brand-charcoal mb-4 flex items-center space-x-2">
                  <MousePointer className="w-5 h-5 text-brand-coral" />
                  <span>Outbound Clicks by Channel</span>
                </h3>

                {stats.clicks_by_channel.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-8">No clicks logged yet.</p>
                ) : (
                  <div className="space-y-4">
                    {stats.clicks_by_channel.map(c => {
                      const percentage = stats.total_clicks > 0 ? (c.count / stats.total_clicks) * 100 : 0;
                      return (
                        <div key={c.channel} className="space-y-1.5">
                          <div className="flex justify-between text-xs font-bold text-brand-charcoal">
                            <span className="uppercase">{c.channel}</span>
                            <span>{c.count} clicks (${c.commission.toFixed(2)} est. GCI)</span>
                          </div>
                          <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                            <div 
                              className="bg-brand-coral h-full rounded-full transition-all duration-500" 
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Subscribers Channel Choice */}
              <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
                <h3 className="font-heading font-black text-xl text-brand-charcoal mb-4 flex items-center space-x-2">
                  <Smartphone className="w-5 h-5 text-brand-coral" />
                  <span>Subscriber Opt-in Channels</span>
                </h3>

                {stats.subscribers_by_channel.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-8">No subscribers on list.</p>
                ) : (
                  <div className="space-y-4">
                    {stats.subscribers_by_channel.map(c => {
                      const totalActive = stats.active_subscribers;
                      const percentage = totalActive > 0 ? (c.count / totalActive) * 100 : 0;
                      return (
                        <div key={c.channel} className="space-y-1.5">
                          <div className="flex justify-between text-xs font-bold text-brand-charcoal">
                            <span className="uppercase">{c.channel}</span>
                            <span>{c.count} subscribers</span>
                          </div>
                          <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                            <div 
                              className="bg-brand-coralSoft h-full rounded-full transition-all duration-500" 
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>

            {/* LIVE CONFIGURATION PANEL */}
            <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
              <h3 className="font-heading font-black text-xl text-brand-charcoal mb-4 flex items-center space-x-2">
                <Settings className="w-5 h-5 text-brand-coral" />
                <span>Active System Configurations</span>
              </h3>
              
              {adminConfig ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Object.entries(adminConfig).map(([key, value]) => (
                    <div key={key} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-1">
                      <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">{key.replace(/_/g, ' ')}</p>
                      <p className="font-mono text-sm font-bold text-brand-charcoal truncate">{value}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm">Loading config parameters...</p>
              )}
            </div>

            {/* LIVE DEALS ADMIN VIEW */}
            <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
                <h3 className="font-heading font-black text-xl text-brand-charcoal flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-brand-coral" />
                  <span>Deals Priority Index Dashboard</span>
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs font-bold text-gray-400 uppercase bg-gray-50">
                      <th className="py-3 px-4">Deal Title</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4 text-right">Original</th>
                      <th className="py-3 px-4 text-right">Deal Price</th>
                      <th className="py-3 px-4 text-right">Discount</th>
                      <th className="py-3 px-4 text-right">Rating</th>
                      <th className="py-3 px-4 text-right">Est. Comm. (GCI)</th>
                      <th className="py-3 px-4 text-right">Priority Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm text-brand-charcoal">
                    {deals.map(deal => (
                      <tr key={deal.id} className="hover:bg-gray-50/50">
                        <td className="py-3 px-4 font-bold max-w-xs truncate">{deal.title}</td>
                        <td className="py-3 px-4 uppercase text-xs font-bold text-gray-500">{deal.category}</td>
                        <td className="py-3 px-4 text-right text-gray-400 font-mono">${deal.original_price.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right font-bold font-mono">${deal.discount_price.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right text-brand-coral font-bold font-mono">{deal.discount_percentage}%</td>
                        <td className="py-3 px-4 text-right font-mono">{deal.rating}★</td>
                        <td className="py-3 px-4 text-right font-bold text-green-600 font-mono">${deal.estimated_commission.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right font-black text-brand-coral font-mono">{deal.score.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-between">
      {/* Navbar */}
      {renderNavbar()}

      {/* Main View Area */}
      <main className="flex-grow">
        {currentView === 'admin' ? renderAdminView() : renderHomeView()}
      </main>

      {/* Footer */}
      <footer className="bg-brand-charcoal text-white border-t border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="space-y-4">
              <span className="text-xl">🙋‍♀️</span>
              <span className="font-heading font-black text-xl tracking-tight text-white block">
                THE MOM <span className="text-brand-coral">DROP</span>
              </span>
              <p className="text-xs text-gray-400 max-w-sm">
                Surfacing premium, high-discount Amazon parenting deals 24/7. Fully monetized via the Amazon Associates affiliate program.
              </p>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-bold text-sm uppercase tracking-wider text-brand-coral">Categories</h4>
              <ul className="space-y-2 text-xs text-gray-400 font-medium">
                <li><button onClick={() => { navigateTo('home'); setSelectedCategory('luxury-beauty'); }} className="hover:text-white transition-colors">💄 Luxury Beauty</button></li>
                <li><button onClick={() => { navigateTo('home'); setSelectedCategory('baby-gear'); }} className="hover:text-white transition-colors">👶 Premium Baby Gear</button></li>
                <li><button onClick={() => { navigateTo('home'); setSelectedCategory('home-organization'); }} className="hover:text-white transition-colors">🧺 Home & Organization</button></li>
              </ul>
            </div>

            <div className="space-y-4">
              <h4 className="font-bold text-sm uppercase tracking-wider text-brand-coral">Legals</h4>
              <p className="text-[10px] text-gray-500 leading-relaxed">
                As an Amazon Associate, The Mom Drop earns from qualifying purchases. Amazon, the Amazon logo, and all brand names are trademarks of Amazon.com, Inc. or its affiliates.
              </p>
              <p className="text-xs text-gray-400">
                &copy; {new Date().getFullYear()} The Mom Drop. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
