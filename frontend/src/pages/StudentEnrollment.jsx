import React, { useState } from 'react';
import { PhotoUpload } from '../components/PhotoUpload';
import { authApi } from '../api/auth';
import {
  GraduationCap,
  User,
  BookOpen,
  Phone,
  Camera,
  Lock,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  AlertCircle,
  Clock,
} from 'lucide-react';

export function StudentEnrollment({ onBackToLogin }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [enrolledStudent, setEnrolledStudent] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Personal
    full_name: '',
    gender: 'Male',
    date_of_birth: '2004-01-01',
    // Step 2: Academic
    department: 'CSE',
    branch: 'CSE',
    year: 1,
    semester: 1,
    section: 'A',
    enrollment_no: '',
    roll_no: '',
    // Step 3: Contact
    college_email: '',
    personal_email: '',
    phone_number: '',
    // Step 4: Photo
    photo: null,
    // Step 5: Security
    password: '',
    confirm_password: '',
  });

  const steps = [
    { number: 1, label: 'Personal', icon: User },
    { number: 2, label: 'Academic', icon: BookOpen },
    { number: 3, label: 'Contact', icon: Phone },
    { number: 4, label: 'Face AI', icon: Camera },
    { number: 5, label: 'Security', icon: Lock },
    { number: 6, label: 'Review', icon: CheckCircle2 },
  ];

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateStep = (step) => {
    setError(null);
    if (step === 1) {
      if (!formData.full_name.trim()) {
        setError('Please enter your full name.');
        return false;
      }
    } else if (step === 2) {
      if (!formData.enrollment_no.trim() || !formData.roll_no.trim()) {
        setError('Please provide both Enrollment Number and Roll Number.');
        return false;
      }
    } else if (step === 3) {
      if (!formData.college_email.trim() || !formData.phone_number.trim()) {
        setError('Please provide your College Email and Phone Number.');
        return false;
      }
      if (!formData.college_email.includes('@')) {
        setError('Please provide a valid email address.');
        return false;
      }
    } else if (step === 4) {
      if (!formData.photo) {
        setError('A clear front-facing face photo is strictly required for biometric recognition.');
        return false;
      }
    } else if (step === 5) {
      if (!formData.password || formData.password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return false;
      }
      if (formData.password !== formData.confirm_password) {
        setError('Passwords do not match.');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 6));
    }
  };

  const handlePrev = () => {
    setError(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep(5) || !formData.photo) return;

    setLoading(true);
    setError(null);

    const submission = new FormData();
    submission.append('full_name', formData.full_name);
    submission.append('gender', formData.gender);
    submission.append('date_of_birth', formData.date_of_birth);
    submission.append('department', formData.department);
    submission.append('branch', formData.branch);
    submission.append('year', formData.year);
    submission.append('semester', formData.semester);
    submission.append('section', formData.section);
    submission.append('enrollment_no', formData.enrollment_no);
    submission.append('roll_no', formData.roll_no);
    submission.append('college_email', formData.college_email);
    submission.append('personal_email', formData.personal_email || '');
    submission.append('phone_number', formData.phone_number);
    submission.append('password', formData.password);
    submission.append('photo', formData.photo);

    try {
      const res = await authApi.registerStudent(submission);
      setEnrolledStudent(res.student);
      setIsSuccess(true);
    } catch (err) {
      setError(err.message || 'Enrollment registration failed.');
    } finally {
      setLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6">
        <div className="w-full max-w-lg glass-panel rounded-3xl p-8 border border-slate-800 text-center shadow-2xl">
          <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-6 shadow-xl">
            <Clock className="w-10 h-10 animate-pulse" />
          </div>

          <h2 className="text-2xl font-black text-white mb-2">Enrollment Submitted!</h2>
          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 mb-4">
            Pending Admin Approval
          </span>

          <p className="text-sm text-slate-300 mb-6">
            Thank you, <span className="font-semibold text-white">{enrolledStudent?.full_name}</span>. Your enrollment details and 128-d AI face recognition embedding have been securely registered.
          </p>

          <div className="bg-slate-900/80 rounded-2xl p-4 border border-slate-800 text-left text-xs space-y-2 mb-6">
            <div className="flex justify-between">
              <span className="text-slate-400">Enrollment No:</span>
              <span className="text-white font-mono font-bold">{enrolledStudent?.enrollment_no}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Roll No:</span>
              <span className="text-white font-mono font-bold">{enrolledStudent?.roll_no}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Department / Branch:</span>
              <span className="text-white font-bold">{enrolledStudent?.department} ({enrolledStudent?.branch})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Section:</span>
              <span className="text-white font-bold">{enrolledStudent?.section} (Sem {enrolledStudent?.semester})</span>
            </div>
          </div>

          <p className="text-xs text-slate-400 mb-6">
            An administrator will review and approve your profile shortly. Once approved, you can immediately log in with your email/enrollment ID and password to access the portal and mark attendance via AI camera.
          </p>

          <button
            onClick={onBackToLogin}
            className="w-full py-3 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-sm shadow-lg shadow-cyan-500/20 transition-all"
          >
            Return to Login Portal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 py-12">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <button
            onClick={onBackToLogin}
            className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-cyan-400 transition-colors mb-4"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Login</span>
          </button>

          <div className="flex items-center justify-center space-x-2">
            <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center text-white shadow-lg">
              <GraduationCap className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black text-white">Student Enrollment Wizard</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Register your profile & enroll your facial biometric for AI attendance tracking
          </p>
        </div>

        {/* Wizard Steps Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between relative">
            <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-0.5 bg-slate-800 -z-0"></div>
            <div
              className="absolute top-1/2 left-0 -translate-y-1/2 h-0.5 bg-cyan-500 -z-0 transition-all duration-300"
              style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
            ></div>

            {steps.map((s) => {
              const Icon = s.icon;
              const isPassed = currentStep > s.number;
              const isCurrent = currentStep === s.number;
              return (
                <div key={s.number} className="relative z-10 flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => {
                      if (s.number < currentStep) setCurrentStep(s.number);
                    }}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                      isCurrent
                        ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30 scale-110'
                        : isPassed
                        ? 'bg-cyan-950 text-cyan-400 border border-cyan-500/40'
                        : 'bg-slate-900 text-slate-500 border border-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                  <span
                    className={`text-[10px] mt-1.5 font-semibold ${
                      isCurrent ? 'text-cyan-400' : isPassed ? 'text-slate-300' : 'text-slate-600'
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Form Card */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* STEP 1: Personal Details */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-white flex items-center space-x-2 pb-2 border-b border-slate-800">
                  <User className="w-4 h-4 text-cyan-400" />
                  <span>Step 1: Personal Information</span>
                </h3>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Full Legal Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => updateField('full_name', e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full glass-input"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      Gender
                    </label>
                    <select
                      value={formData.gender}
                      onChange={(e) => updateField('gender', e.target.value)}
                      className="w-full glass-input"
                    >
                      <option value="Male" className="bg-slate-900">Male</option>
                      <option value="Female" className="bg-slate-900">Female</option>
                      <option value="Other" className="bg-slate-900">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => updateField('date_of_birth', e.target.value)}
                      className="w-full glass-input"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: Academic Details */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-white flex items-center space-x-2 pb-2 border-b border-slate-800">
                  <BookOpen className="w-4 h-4 text-cyan-400" />
                  <span>Step 2: Academic Program Information</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      Enrollment Number <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.enrollment_no}
                      onChange={(e) => updateField('enrollment_no', e.target.value.toUpperCase())}
                      placeholder="e.g. EN2024CS08"
                      className="w-full glass-input font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      Roll Number <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.roll_no}
                      onChange={(e) => updateField('roll_no', e.target.value.toUpperCase())}
                      placeholder="e.g. CS2024008"
                      className="w-full glass-input font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      Department
                    </label>
                    <select
                      value={formData.department}
                      onChange={(e) => updateField('department', e.target.value)}
                      className="w-full glass-input"
                    >
                      <option value="CSE" className="bg-slate-900">Computer Science & Engineering (CSE)</option>
                      <option value="ECE" className="bg-slate-900">Electronics & Communication (ECE)</option>
                      <option value="MECH" className="bg-slate-900">Mechanical Engineering (MECH)</option>
                      <option value="IT" className="bg-slate-900">Information Technology (IT)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      Branch / Specialization
                    </label>
                    <input
                      type="text"
                      value={formData.branch}
                      onChange={(e) => updateField('branch', e.target.value.toUpperCase())}
                      placeholder="e.g. CSE"
                      className="w-full glass-input"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      Year
                    </label>
                    <select
                      value={formData.year}
                      onChange={(e) => updateField('year', Number(e.target.value))}
                      className="w-full glass-input text-center"
                    >
                      <option value={1} className="bg-slate-900">Year 1</option>
                      <option value={2} className="bg-slate-900">Year 2</option>
                      <option value={3} className="bg-slate-900">Year 3</option>
                      <option value={4} className="bg-slate-900">Year 4</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      Semester
                    </label>
                    <select
                      value={formData.semester}
                      onChange={(e) => updateField('semester', Number(e.target.value))}
                      className="w-full glass-input text-center"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                        <option key={s} value={s} className="bg-slate-900">Sem {s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      Section
                    </label>
                    <select
                      value={formData.section}
                      onChange={(e) => updateField('section', e.target.value)}
                      className="w-full glass-input text-center"
                    >
                      <option value="A" className="bg-slate-900">Section A</option>
                      <option value="B" className="bg-slate-900">Section B</option>
                      <option value="C" className="bg-slate-900">Section C</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Contact Details */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-white flex items-center space-x-2 pb-2 border-b border-slate-800">
                  <Phone className="w-4 h-4 text-cyan-400" />
                  <span>Step 3: Contact Information</span>
                </h3>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    College Email Address <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.college_email}
                    onChange={(e) => updateField('college_email', e.target.value.toLowerCase())}
                    placeholder="e.g. rahul@college.edu"
                    className="w-full glass-input"
                    required
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Used for primary authentication and academic notifications.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      Personal Email
                    </label>
                    <input
                      type="email"
                      value={formData.personal_email}
                      onChange={(e) => updateField('personal_email', e.target.value.toLowerCase())}
                      placeholder="e.g. rahul.sharma@gmail.com"
                      className="w-full glass-input"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      Phone Number <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="tel"
                      value={formData.phone_number}
                      onChange={(e) => updateField('phone_number', e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full glass-input"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: Photo Enrollment */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-white flex items-center space-x-2 pb-2 border-b border-slate-800">
                  <Camera className="w-4 h-4 text-cyan-400" />
                  <span>Step 4: Facial Biometric Enrollment</span>
                </h3>

                <p className="text-xs text-slate-300">
                  ApexAttend uses high-accuracy deep neural network facial embeddings (128-dimensional dlib models). Upload a high-resolution, unoccluded front-facing photograph or take one right now using your device webcam.
                </p>

                <PhotoUpload
                  onPhotoSelected={(file) => updateField('photo', file)}
                  initialPreview={formData.photo ? URL.createObjectURL(formData.photo) : null}
                />
              </div>
            )}

            {/* STEP 5: Security */}
            {currentStep === 5 && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-white flex items-center space-x-2 pb-2 border-b border-slate-800">
                  <Lock className="w-4 h-4 text-cyan-400" />
                  <span>Step 5: Portal Account Password</span>
                </h3>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Create Password <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => updateField('password', e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full glass-input"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Confirm Password <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="password"
                    value={formData.confirm_password}
                    onChange={(e) => updateField('confirm_password', e.target.value)}
                    placeholder="Repeat password"
                    className="w-full glass-input"
                    required
                  />
                </div>
              </div>
            )}

            {/* STEP 6: Review & Submit */}
            {currentStep === 6 && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-white flex items-center space-x-2 pb-2 border-b border-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                  <span>Step 6: Review & Final Submission</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Full Name:</span>
                    <span className="text-white font-bold">{formData.full_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Enrollment / Roll No:</span>
                    <span className="text-white font-mono font-bold">{formData.enrollment_no} / {formData.roll_no}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Department & Section:</span>
                    <span className="text-white font-bold">{formData.department} ({formData.section}, Sem {formData.semester})</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">College Email:</span>
                    <span className="text-white font-bold">{formData.college_email}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Phone Number:</span>
                    <span className="text-white font-bold">{formData.phone_number}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Biometric Photo:</span>
                    <span className="text-emerald-400 font-bold flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Ready for AI enrollment
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-800/40 text-cyan-300 text-xs">
                  Upon submission, your face embedding will be computed instantly, and your account will be sent to the college administration for verification.
                </div>
              </div>
            )}

            {/* Error Notification */}
            {error && (
              <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800/50 text-rose-300 text-xs flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={handlePrev}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-700 flex items-center space-x-1.5 transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>
              ) : (
                <div></div>
              )}

              {currentStep < 6 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/20 flex items-center space-x-1.5 transition-all"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-white text-xs font-black shadow-lg shadow-cyan-500/20 flex items-center space-x-2 transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Submit Enrollment & Train Face</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
