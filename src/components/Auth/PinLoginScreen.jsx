import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { loginWithPin, clearAuthError } from '../../store/slices/authSlice';
import dreamLabsLogo from '../../assets/DreamLabsLogoNew.png';

export default function PinLoginScreen() {
  const dispatch = useDispatch();
  const { loading, error } = useSelector(s => s.auth);
  const [pin, setPin] = useState('');
  const [shake, setShake] = useState(false);
  const inputRef = useRef(null);

  const hotelName = (() => {
    try { return JSON.parse(localStorage.getItem('hotelSettings') || '{}').hotelName || 'Hotel POS'; }
    catch { return 'Hotel POS'; }
  })();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (error) {
      setShake(true);
      setPin('');
      const t = setTimeout(() => { setShake(false); dispatch(clearAuthError()); }, 700);
      return () => clearTimeout(t);
    }
  }, [error, dispatch]);

  const handleDigit = (d) => {
    if (pin.length < 6) setPin(p => p + d);
  };

  const handleBackspace = () => setPin(p => p.slice(0, -1));

  const handleSubmit = async () => {
    if (pin.length < 4) return;
    dispatch(loginWithPin(pin));
  };

  const handleKeyDown = (e) => {
    if (e.key >= '0' && e.key <= '9') handleDigit(e.key);
    else if (e.key === 'Backspace') handleBackspace();
    else if (e.key === 'Enter') handleSubmit();
  };

  return (
    <div
      className="fixed inset-0 z-[9999] bg-gray-950 flex flex-col items-center justify-center"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
      ref={inputRef}
    >
      {/* Background dots */}
      <div className="absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: 'radial-gradient(circle, #60a5fa 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

      <div className="relative z-10 w-full max-w-xs px-5">
        {/* Logo + hotel name */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-blue-900/60">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-8 h-8">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <h1 className="text-white text-xl font-bold">{hotelName}</h1>
          <p className="text-gray-500 text-sm mt-0.5">Enter your staff PIN to continue</p>
        </div>

        {/* PIN dots */}
        <div className={`flex justify-center gap-4 mb-6 transition-transform ${shake ? 'animate-[shake_0.4s_ease]' : ''}`}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i}
              className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-150
                ${i < pin.length
                  ? 'bg-blue-500 border-blue-400 scale-110'
                  : 'bg-transparent border-gray-600'
                }`}
            />
          ))}
        </div>

        {/* Error */}
        {error && (
          <p className="text-red-400 text-xs text-center font-semibold mb-4">{error}</p>
        )}

        {/* Numpad */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
          <div className="grid grid-cols-3 gap-2.5">
            {[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map((d, i) => (
              <button
                key={i}
                onClick={() => {
                  if (d === '⌫') handleBackspace();
                  else if (d !== '') handleDigit(String(d));
                }}
                disabled={d === '' || loading}
                className={`h-14 rounded-xl text-lg font-bold transition-all active:scale-95
                  ${d === '' ? 'invisible' : ''}
                  ${d === '⌫'
                    ? 'bg-gray-800 hover:bg-gray-700 text-gray-400 border border-gray-700'
                    : 'bg-gray-800 hover:bg-gray-700 active:bg-gray-600 text-white border border-gray-700/60'
                  }`}
              >
                {d}
              </button>
            ))}
          </div>

          <button
            onClick={handleSubmit}
            disabled={pin.length < 4 || loading}
            className="mt-3 w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-600
              text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading
              ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                  Sign In
                </>
            }
          </button>
        </div>

        {/* DreamLabs footer */}
        <div className="flex items-center justify-center gap-2 mt-8 opacity-40">
          <img src={dreamLabsLogo} alt="DreamLabs" className="w-5 h-5 rounded-full object-cover" />
          <span className="text-gray-500 text-xs">DreamLabs IT Solutions</span>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20%      { transform: translateX(-8px); }
          40%      { transform: translateX(8px); }
          60%      { transform: translateX(-6px); }
          80%      { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
}
