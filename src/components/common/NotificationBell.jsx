import { useState, useEffect, useContext, useRef } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { AuthContext } from '../../context/AuthContext';
import { Bell, CheckCircle, X } from 'lucide-react';

const NotificationBell = () => {
  const { user } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!user) return;

    // Listen for notifications targeted to this user ID OR their role (e.g. all MANAGERs)
    // Firestore OR queries are limited, so we'll do two separate queries and merge, or just one if we simplify.
    // For simplicity, let's just use two active listeners and merge them.
    
    const notifsRef = collection(db, 'notifications');
    
    // 1. Direct Notifications
    const qDirect = query(notifsRef, where('targetUserId', '==', user.uid));
    const unsubDirect = onSnapshot(qDirect, (snap) => {
      handleSnapshot(snap, 'direct');
    });

    // 2. Role-Based Notifications
    const qRole = query(notifsRef, where('targetRole', '==', user.role));
    const unsubRole = onSnapshot(qRole, (snap) => {
      handleSnapshot(snap, 'role');
    });

    return () => {
      unsubDirect();
      unsubRole();
    };
  }, [user]);

  // Merge state handling
  const [directNotifs, setDirectNotifs] = useState([]);
  const [roleNotifs, setRoleNotifs] = useState([]);

  const handleSnapshot = (snapshot, type) => {
    const data = [];
    snapshot.forEach(d => data.push({ id: d.id, ...d.data() }));
    if (type === 'direct') setDirectNotifs(data);
    else setRoleNotifs(data);
  };

  useEffect(() => {
    // Combine, deduplicate, sort
    const combined = [...directNotifs, ...roleNotifs];
    const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
    unique.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    setNotifications(unique);
  }, [directNotifs, roleNotifs]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (id) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { isRead: true });
    } catch (error) {
      console.error("Failed to mark notification as read", error);
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.isRead);
    for (const n of unread) {
      await markAsRead(n.id);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors focus:outline-none"
      >
        <Bell size={22} className={unreadCount > 0 ? "text-primary-600 animate-pulse" : ""} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-in slide-in-from-top-2 duration-200">
          <div className="flex justify-between items-center px-4 py-3 bg-gray-50 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="text-xs font-medium text-primary-600 hover:text-primary-800">
                Mark all as read
              </button>
            )}
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {notifications.length > 0 ? (
              <div className="divide-y divide-gray-50">
                {notifications.map((notif) => (
                  <div 
                    key={notif.id} 
                    className={`p-4 hover:bg-gray-50 transition-colors flex gap-3 ${!notif.isRead ? 'bg-primary-50/30' : ''}`}
                    onClick={() => !notif.isRead && markAsRead(notif.id)}
                  >
                    <div className="shrink-0 mt-0.5">
                      {notif.type === 'APPROVAL' ? <CheckCircle size={18} className="text-green-500" /> : 
                       notif.type === 'REJECTION' ? <X size={18} className="text-red-500" /> : 
                       <Bell size={18} className="text-blue-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm text-gray-800 ${!notif.isRead ? 'font-medium' : ''}`}>
                        {notif.message}
                      </p>
                      <span className="text-xs text-gray-400 mt-1 block">
                        {new Date(notif.createdAt).toLocaleDateString()} {new Date(notif.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                    {!notif.isRead && (
                      <div className="shrink-0 flex items-center">
                        <span className="w-2 h-2 bg-primary-600 rounded-full"></span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500 flex flex-col items-center">
                <Bell size={32} className="text-gray-300 mb-2" />
                <p>No new notifications</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
