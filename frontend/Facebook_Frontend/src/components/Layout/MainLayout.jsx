import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { Home, Tv, Store, Users, MessageCircle, Grid, Clock, Bookmark, Film, Folder, ChevronLeft, ShieldAlert, Search, Settings2, UserRound } from "lucide-react";
import "./MainLayout.css";
import Avatar from '../common/Avatar';
import SearchBar from '../common/SearchBar';
import NotificationBell from '../Notifications/NotificationBell';
import UserDropdown from './UserDropdown';
import ChatFloatingPanel from '../Chat/ChatFloatingPanel';
import friendshipService from '../../services/friendshipService';
import savedItemsService from '../../services/savedItemsService';
import { useLocalization } from '../../contexts/useLocalization';
import { translateCatalogKey } from '../../shared/localizationRuntime';
import toast from '../../shared/appToast';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const IconTooltip = ({ label, children }) => (
  <Tooltip>
    <TooltipTrigger asChild>{children}</TooltipTrigger>
    <TooltipContent>{label}</TooltipContent>
  </Tooltip>
);

const MainLayout = () => {
  const { user } = useAuth();
  const { t } = useLocalization();
  const navigate = useNavigate();
  const location = useLocation();
  const [contacts, setContacts] = useState([]);
  const [chatPanelOpen, setChatPanelOpen] = useState(false);
  const [chatInitialFriend, setChatInitialFriend] = useState(null);
  const [savedCollections, setSavedCollections] = useState([]);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  // Focus the input when the mobile search sheet opens
  useEffect(() => {
    if (!mobileSearchOpen) return;
    const t = setTimeout(
      () => document.querySelector('.mobile-search-field .search-bar-input')?.focus(),
      50
    );
    return () => clearTimeout(t);
  }, [mobileSearchOpen]);

  const isOnSaved = location.pathname.startsWith('/saved');

  // Load contacts
  useEffect(() => {
    let cancelled = false;
    friendshipService.getFriends(1, 20)
      .then((res) => { if (!cancelled) setContacts(res.data?.data || []); })
      .catch((error) => toast.apiError(error, t('friends.loadFailed'), { id: "layout-contacts-error", context: "layout.contacts.load" }));
    return () => { cancelled = true; };
  }, [t]);

  // Fetch collections từ API khi vào /saved
  useEffect(() => {
    if (isOnSaved) {
      savedItemsService.getCollections()
        .then((res) => setSavedCollections(res.data?.data ?? []))
        .catch((error) => {
          setSavedCollections([]);
          toast.apiError(error, t('saved.loadFailed'), { id: "layout-collections-error", context: "layout.collections.load" });
        });
    }
  }, [isOnSaved, location.search, t]);

  const searchParams = new URLSearchParams(location.search);
  const activeCol = searchParams.get('col');

  const renderLeftSidebar = () => {
    if (isOnSaved) {
      return (
        <aside className="sidebar sidebar--saved">
          <div className="saved-sb-header">
            <button className="saved-sb-back" onClick={() => navigate('/')} title={translateCatalogKey('ui.components.layout.mainlayout.ve-trang-chu.a7f97907')}>
              <ChevronLeft size={20} />
            </button>
            <h2 className="saved-sb-title">{t('nav.saved')}</h2>
          </div>

          <Link
            to="/saved"
            className={`saved-sb-item${!activeCol ? ' saved-sb-item--active' : ''}`}
          >
            <span className="saved-sb-icon"><Bookmark size={20} /></span>
            <span>{t('nav.savedItems')}</span>
          </Link>

          {savedCollections.length > 0 && (
            <div className="saved-sb-section">
              <p className="saved-sb-section-label">{t('nav.collections')}</p>
              {savedCollections.map((col) => (
                <Link
                  key={col.id}
                  to={`/saved?col=${col.id}`}
                  className={`saved-sb-item${activeCol === col.id ? ' saved-sb-item--active' : ''}`}
                >
                  <span className="saved-sb-icon"><Folder size={20} /></span>
                  <span>{col.name}</span>
                </Link>
              ))}
            </div>
          )}
        </aside>
      );
    }

    return (
      <aside className="sidebar">
        <Link to={`/profile/${user?.id}`} className="menu-item mt-4" style={{ textDecoration: 'none', color: 'inherit' }}>
          <Avatar src={user?.avatarUrl} className="w-9 h-9" />
          <span className="font-semibold">{user?.fullName}</span>
        </Link>
        <Link
          to="/friends"
          className={`menu-item${location.pathname.startsWith('/friends') ? ' active' : ''}`}
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          <Users size={28} className="text-blue-500 mr-2" /> {t('nav.friends')}
        </Link>
        <Link
          to="/memories"
          className={`menu-item${location.pathname.startsWith('/memories') ? ' active' : ''}`}
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          <Clock size={28} className="text-blue-500 mr-2" /> {t('nav.memories')}
        </Link>
        <Link
          to="/saved"
          className={`menu-item${location.pathname.startsWith('/saved') ? ' active' : ''}`}
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          <Bookmark size={28} className="text-purple-500 mr-2" /> {t('nav.saved')}
        </Link>
      </aside>
    );
  };

  return (
    <div className="main-layout">
      {/* 1. NAVBAR */}
      <nav className="navbar">
        {/* Góc Trái */}
        <div className="nav-left">
          <Link to="/">
            <img src="../../assets/images/Facebook-Logo.png" className="nav-logo" alt={translateCatalogKey('ui.components.layout.mainlayout.logo.c75ef89c')} />
          </Link>
          {/* Full search bar (desktop) */}
          <span className="nav-search-desktop"><SearchBar /></span>
          {/* Collapsed search icon (mobile) → opens the search sheet */}
          <Button variant="ghost" size="icon" className="nav-search-mobile-btn" onClick={() => setMobileSearchOpen(true)} aria-label={translateCatalogKey('common.search')}>
            <Search size={20} />
          </Button>
        </div>

        {/* Giữa */}
        <div className="nav-center">
          <Link to="/" className={`nav-tab${location.pathname === '/' ? ' active' : ''}`}><Home size={28} /></Link>
          <Link to="/live" className={`nav-tab${location.pathname.startsWith('/live') ? ' active' : ''}`} aria-label={translateCatalogKey('post.liveVideo')}><Tv size={28} /></Link>
          <Link to="/marketplace" className={`nav-tab${location.pathname.startsWith('/marketplace') ? ' active' : ''}`} aria-label={translateCatalogKey('permissions.modules.marketplace')}><Store size={28} /></Link>
          <Link to="/friends" className={`nav-tab${location.pathname.startsWith('/friends') ? ' active' : ''}`}><Users size={28} /></Link>
          <Link to="/reels" className={`nav-tab${location.pathname.startsWith('/reels') ? ' active' : ''}`}><Film size={28} /></Link>
        </div>

        {/* Góc Phải */}
        <div className="nav-right">
          {user?.isAdmin && (
            <IconTooltip label={translateCatalogKey('ui.components.layout.mainlayout.admin.ac03e484')}>
              <Link to="/admin" className="icon-btn admin-entry-btn" aria-label={translateCatalogKey('ui.components.layout.mainlayout.admin.ac03e484')}>
                <ShieldAlert size={20} />
              </Link>
            </IconTooltip>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="icon-btn nav-grid-btn" aria-label={t('account.menu')} title={t('account.menu')}><Grid size={20} /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="app-shortcuts-menu w-64">
              <DropdownMenuLabel>{t('account.menu')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => navigate(`/profile/${user?.id}`)}><UserRound /> {t('nav.profile')}</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate('/settings')}><Settings2 /> {t('settings.title')}</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate('/marketplace')}><Store /> {translateCatalogKey('permissions.modules.marketplace')}</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate('/live')}><Tv /> {translateCatalogKey('post.liveVideo')}</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate('/memories')}><Clock /> {t('nav.memories')}</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate('/saved')}><Bookmark /> {t('nav.saved')}</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate('/messages')}><MessageCircle /> {t('nav.messages')}</DropdownMenuItem>
              {user?.isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => navigate('/admin')}><ShieldAlert /> {translateCatalogKey('ui.components.layout.mainlayout.admin.ac03e484')}</DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <IconTooltip label={t('nav.messages')}>
            <Button variant="secondary" size="icon" className="icon-btn nav-msg-btn" onClick={() => setChatPanelOpen((prev) => !prev)} aria-label={t('nav.messages')}>
              <MessageCircle size={20} />
            </Button>
          </IconTooltip>
          <NotificationBell />
          <UserDropdown />
        </div>
      </nav>

      {/* 2. BODY KHUNG 3 CỘT */}
      <div className="body-container">
        
        {/* Cột Trái: Menu hoặc Saved Sidebar */}
        {renderLeftSidebar()}

        {/* Cột Giữa: Bảng Tin */}
        <main className="feed-container">
          <Outlet />
        </main>

        {/* Cột Phải: Liên hệ */}
        <aside className="sidebar">
          {contacts.length > 0 && (
            <>
              <h4 className="text-gray-500 font-semibold text-[15px] px-2 mt-4 mb-2">{t('nav.contacts')}</h4>
              {contacts.map((contact) => (
                <div
                  key={contact.friendshipId}
                  className="menu-item"
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    setChatInitialFriend(contact);
                    setChatPanelOpen(true);
                  }}
                >
                  <Avatar src={contact.profile?.avatarUrl || contact.avatarUrl} className="w-8 h-8" />
                  <span className="font-semibold text-[15px]">
                    {contact.profile?.fullName || contact.fullName}
                  </span>
                </div>
              ))}
            </>
          )}
        </aside>

      </div>

      {/* Mobile search sheet (mở khi bấm icon kính lúp trên header mobile) */}
      <Sheet open={mobileSearchOpen} onOpenChange={setMobileSearchOpen}>
        <SheetContent side="top" className="mobile-search-sheet">
          <SheetHeader className="sr-only">
            <SheetTitle>{translateCatalogKey('common.search')}</SheetTitle>
            <SheetDescription>{translateCatalogKey('common.search')}</SheetDescription>
          </SheetHeader>
          <Button variant="ghost" size="icon" className="mobile-search-back" onClick={() => setMobileSearchOpen(false)} aria-label={translateCatalogKey('common.close')}>
            <ChevronLeft size={22} />
          </Button>
          <div className="mobile-search-field"><SearchBar onNavigate={() => setMobileSearchOpen(false)} /></div>
        </SheetContent>
      </Sheet>

      {/* Mobile bottom navigation (hiện trên màn hình nhỏ, thay cho nav-center bị ẩn) */}
      <nav className="mobile-nav">
        <Link to="/" className={location.pathname === '/' ? 'active' : ''} title={t('nav.home')}><Home size={24} /></Link>
        <Link to="/friends" className={location.pathname.startsWith('/friends') ? 'active' : ''} title={t('nav.friends')}><Users size={24} /></Link>
        <Link to="/reels" className={location.pathname.startsWith('/reels') ? 'active' : ''} title={t('nav.reels')}><Film size={24} /></Link>
        <div className="mobile-nav-item" onClick={() => setChatPanelOpen((prev) => !prev)} title={t('nav.messages')}><MessageCircle size={24} /></div>
        <Link to={`/profile/${user?.id}`} className={location.pathname.startsWith('/profile') ? 'active' : ''} title={t('nav.profile')}><Avatar src={user?.avatarUrl} className="w-6 h-6" /></Link>
      </nav>

      {/* Floating Chat Panel */}
      {chatPanelOpen && (
        <ChatFloatingPanel
          key={chatInitialFriend?.userId || chatInitialFriend?.id || 'panel'}
          initialFriend={chatInitialFriend}
          onClose={() => { setChatPanelOpen(false); setChatInitialFriend(null); }}
        />
      )}
    </div>
  );
};

export default MainLayout;
