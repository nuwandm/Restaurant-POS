import React, { useEffect, useState, useMemo, lazy, Suspense, Component } from 'react';
import { useDispatch } from 'react-redux';

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div className="h-screen bg-gray-950 flex items-center justify-center p-8">
          <div className="bg-gray-800 border border-red-700/40 rounded-2xl p-8 max-w-lg w-full text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" className="w-6 h-6">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <h2 className="text-white font-bold text-lg mb-2">Something went wrong</h2>
            <p className="text-gray-400 text-sm mb-1">{this.state.error?.message}</p>
            <p className="text-gray-600 text-xs mb-6">Please restart the application. If this persists, contact support.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold text-sm transition-colors"
            >
              Restart App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
import { fetchTables } from './store/slices/tableSlice';
import { fetchMenuItems, fetchCategories } from './store/slices/menuSlice';
import { fetchActiveOrders, loadPendingOrders } from './store/slices/orderSlice';
import { loadOpenShift } from './store/slices/shiftSlice';
import { logout } from './store/slices/authSlice';
import { useSelector } from 'react-redux';
import { canViewPage, getAllowedViews } from './utils/permissions';
import Layout from './components/Layout/Layout';
import LoadingSpinner from './components/Common/LoadingSpinner';
import LicenseGate from './components/LicenseGate';
import ShortcutsHelp from './components/ShortcutsHelp';
import ShiftOpenOverlay from './components/Shift/ShiftOpenOverlay';
import PinLoginScreen from './components/Auth/PinLoginScreen';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { loadAppShortcuts } from './utils/itemShortcuts';
import toast from 'react-hot-toast';

const POSView = lazy(() => import('./views/POSView'));
const OrdersView = lazy(() => import('./views/OrdersView'));
const ReportsView = lazy(() => import('./views/ReportsView'));
const MenuManagementView = lazy(() => import('./views/MenuManagementView'));
const SettingsView = lazy(() => import('./views/SettingsView'));
const TableManagementView = lazy(() => import('./views/TableManagementView'));
const KitchenView = lazy(() => import('./views/KitchenView'));
const ShiftView = lazy(() => import('./views/ShiftView'));

function App() {
  const dispatch = useDispatch();
  const { currentShift, shiftLoaded } = useSelector(s => s.shift);
  const { currentUser } = useSelector(s => s.auth);
  const [currentView, setCurrentView] = useState('pos');

  // When user logs in, redirect to first allowed view if current one is blocked
  useEffect(() => {
    if (currentUser && !canViewPage(currentUser.role, currentView)) {
      const allowed = getAllowedViews(currentUser.role);
      setCurrentView(allowed[0] || 'pos');
    }
  }, [currentUser]);
  const [loading, setLoading] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [kotCount, setKotCount] = useState(0);
  const [hotelName, setHotelName] = useState(() => {
    try { return JSON.parse(localStorage.getItem('hotelSettings') || '{}').hotelName || 'My Hotel'; }
    catch { return 'Hotel POS'; }
  });

  // Read shortcuts fresh from localStorage on every keydown so Settings changes take effect immediately
  const navTo = (view) => {
    if (!currentUser || !canViewPage(currentUser.role, view)) return;
    setCurrentView(view);
  };

  const navActions = useMemo(() => ({
    'help':         () => setShowHelp(v => !v),
    'nav-pos':      () => navTo('pos'),
    'nav-orders':   () => navTo('orders'),
    'nav-reports':  () => navTo('reports'),
    'nav-menu':     () => navTo('menu'),
    'nav-tables':   () => navTo('tables'),
    'nav-settings': () => navTo('settings'),
    'nav-shift':    () => navTo('shift'),
  }), [currentUser]);

  useEffect(() => {
    const onKeyDown = (e) => {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;
      const combo = [e.ctrlKey && 'Ctrl', e.altKey && 'Alt', e.shiftKey && 'Shift', e.key]
        .filter(Boolean).join('+');
      if (combo === 'Escape') { setShowHelp(false); return; }
      const sc = loadAppShortcuts(); // always fresh
      const actionId = Object.keys(sc).find(k => sc[k] === combo);
      if (actionId && navActions[actionId]) {
        e.preventDefault();
        navActions[actionId]();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navActions]);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Use allSettled so one failure doesn't block the whole app
        const results = await Promise.allSettled([
          dispatch(fetchTables()).unwrap(),
          dispatch(fetchMenuItems()).unwrap(),
          dispatch(fetchCategories()).unwrap(),
          dispatch(fetchActiveOrders()).unwrap(),
          dispatch(loadPendingOrders()).unwrap(),
          dispatch(loadOpenShift()).unwrap(),
        ]);
        const failed = results.filter(r => r.status === 'rejected');
        if (failed.length === 0) {
          toast.success('System ready!');
        } else {
          console.warn('Some data failed to load:', failed.map(f => f.reason));
          toast.error('Some data could not be loaded — check DB connection');
        }
      } catch (error) {
        console.error('Failed to load initial data:', error);
        toast.error('Failed to connect to database');
      } finally {
        setLoading(false);
      }
    };

    // Safety net — never stay loading more than 10s
    const timeout = setTimeout(() => setLoading(false), 10000);
    loadInitialData().finally(() => clearTimeout(timeout));

    const interval = setInterval(() => {
      dispatch(fetchActiveOrders());
    }, 30000);

    return () => clearInterval(interval);
  }, [dispatch]);

  useEffect(() => {
    const refreshKotCount = async () => {
      try {
        const res = await window.electron.database({ action: 'getActiveKots', data: {} });
        if (res.success) setKotCount(res.data.length);
      } catch { /* ignore */ }
    };
    refreshKotCount();
    const interval = setInterval(refreshKotCount, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950">
        <div className="text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto shadow-xl shadow-blue-900/50">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-7 h-7">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <div>
            <p className="text-white font-bold text-base">Hotel POS System</p>
            <p className="text-gray-500 text-sm mt-1">Initializing...</p>
          </div>
          <div className="flex justify-center">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  const role = currentUser?.role;

  return (
    <ErrorBoundary>
      <LicenseGate>
        {/* PIN login gate — shown when no user is logged in */}
        {!currentUser && <PinLoginScreen />}

        <Layout
          currentView={currentView}
          onViewChange={(v) => navTo(v)}
          hotelName={hotelName}
          kotCount={kotCount}
          hasOpenShift={!!currentShift}
          currentUser={currentUser}
          onLogout={() => dispatch(logout())}
          userRole={role}
        >
          <Suspense fallback={<LoadingSpinner />}>
            {currentView === 'pos'      && <POSView />}
            {currentView === 'orders'   && canViewPage(role, 'orders')   && <OrdersView />}
            {currentView === 'kitchen'  && canViewPage(role, 'kitchen')  && <KitchenView onKotCountChange={setKotCount} />}
            {currentView === 'reports'  && canViewPage(role, 'reports')  && <ReportsView />}
            {currentView === 'menu'     && canViewPage(role, 'menu')     && <MenuManagementView />}
            {currentView === 'tables'   && canViewPage(role, 'tables')   && <TableManagementView />}
            {currentView === 'settings' && canViewPage(role, 'settings') && <SettingsView onHotelNameChange={setHotelName} />}
            {currentView === 'shift'    && canViewPage(role, 'shift')    && <ShiftView />}
          </Suspense>
        </Layout>

        {/* Block all actions when no shift is open (after initial load) */}
        {currentUser && shiftLoaded && !currentShift && <ShiftOpenOverlay />}
        {showHelp && <ShortcutsHelp onClose={() => setShowHelp(false)} />}
      </LicenseGate>
    </ErrorBoundary>
  );
}

export default App;
