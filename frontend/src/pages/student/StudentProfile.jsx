import React, { useState, useEffect } from 'react';
import { studentApi } from '../../api/student';
import { authApi } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';
import { PhotoUpload } from '../../components/PhotoUpload';
import {
  User,
  Mail,
  Phone,
  BookOpen,
  Lock,
  Camera,
  CheckCircle2,
  AlertCircle,
  Save,
} from 'lucide-react';

export function StudentProfile() {
  const { updateUserProfile } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  // Editable fields
  const [personalEmail, setPersonalEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  // Password fields
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwMessage, setPwMessage] = useState(null);
  const [pwError, setPwError] = useState(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const data = await studentApi.getProfile();
      setProfile(data);
      setPersonalEmail(data.personal_email || '');
      setPhoneNumber(data.phone_number || '');
    } catch (err) {
      setError(err.message || 'Failed to load profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateContact = async (e) => {
    e.preventDefault();
    setSaveLoading(true);
    setMessage(null);
    setError(null);
    try {
      const updated = await studentApi.updateProfile({
        personal_email: personalEmail,
        phone_number: phoneNumber,
      });
      setProfile(updated);
      setMessage('Contact information updated successfully.');
    } catch (err) {
      setError(err.message || 'Update failed.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handlePhotoUpdate = async (file) => {
    if (!file) return;
    setMessage(null);
    setError(null);
    try {
      const res = await studentApi.uploadPhoto(file);
      setProfile((prev) => ({ ...prev, photo_url: res.photo_url }));
      updateUserProfile({ photo_url: res.photo_url });
      setMessage('Profile photo and facial recognition embedding updated successfully.');
    } catch (err) {
      setError(err.message || 'Failed to upload photo.');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwMessage(null);
    setPwError(null);

    if (newPw.length < 6) {
      setPwError('New password must be at least 6 characters long.');
      return;
    }
    if (newPw !== confirmPw) {
      setPwError('New passwords do not match.');
      return;
    }

    setPwLoading(true);
    try {
      await authApi.changePassword(currentPw, newPw);
      setPwMessage('Password changed successfully.');
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    } catch (err) {
      setPwError(err.message || 'Password update failed.');
    } finally {
      setPwLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-6 animate-pulse">
        <div className="h-40 rounded-3xl bg-slate-900 border border-slate-800"></div>
        <div className="h-64 rounded-3xl bg-slate-900 border border-slate-800"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      {/* Profile Overview Card */}
      <div className="p-6 sm:p-8 rounded-3xl glass-card border border-slate-800 shadow-xl flex flex-col sm:flex-row items-center space-y-6 sm:space-y-0 sm:space-x-8">
        <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl overflow-hidden border-2 border-cyan-500/50 shadow-2xl bg-slate-900 shrink-0">
          {profile?.photo_url ? (
            <img src={profile.photo_url} alt={profile.full_name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center font-bold text-4xl text-cyan-400">
              {profile?.full_name?.charAt(0)}
            </div>
          )}
        </div>

        <div className="flex-1 text-center sm:text-left space-y-1">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <h2 className="text-2xl font-black text-white">{profile?.full_name}</h2>
            <span className="px-2.5 py-0.5 text-xs font-bold uppercase rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              {profile?.enrollment_status}
            </span>
          </div>

          <p className="text-xs text-slate-400 font-mono">
            Roll: <span className="text-slate-200">{profile?.roll_no}</span> • Enr: <span className="text-slate-200">{profile?.enrollment_no}</span>
          </p>

          <p className="text-xs text-cyan-400 font-medium pt-1">
            {profile?.department} ({profile?.branch}) • Year {profile?.year}, Semester {profile?.semester}, Section {profile?.section}
          </p>
          <p className="text-xs text-slate-400">
            College Email: <span className="text-slate-200 font-medium">{profile?.college_email}</span>
          </p>
        </div>
      </div>

      {message && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Two Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact Information (Editable) */}
        <div className="p-6 rounded-3xl glass-card border border-slate-800 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2 pb-2 border-b border-slate-800">
            <Mail className="w-4 h-4 text-cyan-400" />
            <span>Contact Information</span>
          </h3>

          <form onSubmit={handleUpdateContact} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Personal Email
              </label>
              <input
                type="email"
                value={personalEmail}
                onChange={(e) => setPersonalEmail(e.target.value)}
                placeholder="e.g. personal@gmail.com"
                className="w-full glass-input text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full glass-input text-xs"
                required
              />
            </div>

            <p className="text-[11px] text-slate-400">
              Note: Academic details (Roll No, Enrollment, Branch, Semester) are managed strictly by college administrators.
            </p>

            <button
              type="submit"
              disabled={saveLoading}
              className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center space-x-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saveLoading ? 'Saving...' : 'Save Contact Details'}</span>
            </button>
          </form>
        </div>

        {/* Change Password */}
        <div className="p-6 rounded-3xl glass-card border border-slate-800 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2 pb-2 border-b border-slate-800">
            <Lock className="w-4 h-4 text-cyan-400" />
            <span>Account Security</span>
          </h3>

          <form onSubmit={handleChangePassword} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Current Password
              </label>
              <input
                type="password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                placeholder="••••••••"
                className="w-full glass-input text-xs"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                New Password
              </label>
              <input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full glass-input text-xs"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                placeholder="Repeat new password"
                className="w-full glass-input text-xs"
                required
              />
            </div>

            {pwMessage && (
              <p className="text-xs text-emerald-400">{pwMessage}</p>
            )}
            {pwError && (
              <p className="text-xs text-rose-400">{pwError}</p>
            )}

            <button
              type="submit"
              disabled={pwLoading}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-all"
            >
              {pwLoading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>

      {/* Face Photograph & AI Embedding Update */}
      <div className="p-6 rounded-3xl glass-card border border-slate-800 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center space-x-2 pb-2 border-b border-slate-800">
          <Camera className="w-4 h-4 text-cyan-400" />
          <span>Update Facial Biometric Photograph</span>
        </h3>
        <p className="text-xs text-slate-400">
          Need to retrain your face recognition profile with a newer photo? Upload a recent clear photo. ApexAttend will automatically extract your 128-d face embedding vector and update the live recognition engine.
        </p>

        <PhotoUpload
          onPhotoSelected={handlePhotoUpdate}
          label="Select New Front-Facing Photo"
        />
      </div>
    </div>
  );
}
