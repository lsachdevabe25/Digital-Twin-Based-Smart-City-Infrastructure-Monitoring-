import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Layers, User, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  if (user) {
    return <Navigate to="/" replace />;
  }

  const validate = () => {
    const newErrors = {};
    const trimmedName = name.trim();
    if (!trimmedName) {
      newErrors.name = 'Full name is required';
    } else if (trimmedName.length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    const trimmedEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail) {
      newErrors.email = 'Email address is required';
    } else if (!emailRegex.test(trimmedEmail)) {
      newErrors.email = 'Please enter a valid email address';
    }

    return newErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setTouched({ name: true, email: true });
      return;
    }

    login({
      name: name.trim(),
      email: email.trim().toLowerCase()
    });

    navigate('/', { replace: true });
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const validationErrors = validate();
    setErrors(validationErrors);
  };

  return (
    <div className="login-page-root">
      <div className="login-card-container">
        {/* Brand Header */}
        <div className="login-brand-header">
          <div className="login-brand-icon">
            <Layers size={28} color="#2563eb" strokeWidth={2.2} />
          </div>
          <h1 className="login-app-title">Digital Twin City Smart Manufacturing System</h1>
          <p className="login-app-subtitle">Operator Identity & System Access</p>
        </div>

        {/* Identity Form */}
        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <div className="login-form-group">
            <label htmlFor="fullName" className="login-label">
              Full Name
            </label>
            <div className={`login-input-wrap ${touched.name && errors.name ? 'input-error' : ''}`}>
              <User size={18} className="login-input-icon" />
              <input
                id="fullName"
                type="text"
                className="login-input"
                placeholder="e.g. Lipieka Verma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => handleBlur('name')}
                autoComplete="name"
              />
            </div>
            {touched.name && errors.name && (
              <span className="login-inline-error">{errors.name}</span>
            )}
          </div>

          <div className="login-form-group">
            <label htmlFor="email" className="login-label">
              Email Address
            </label>
            <div className={`login-input-wrap ${touched.email && errors.email ? 'input-error' : ''}`}>
              <Mail size={18} className="login-input-icon" />
              <input
                id="email"
                type="email"
                className="login-input"
                placeholder="e.g. operator@smartcity.gov"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => handleBlur('email')}
                autoComplete="email"
              />
            </div>
            {touched.email && errors.email && (
              <span className="login-inline-error">{errors.email}</span>
            )}
          </div>

          <button type="submit" className="login-submit-button">
            <span>Access Twin Console</span>
            <ArrowRight size={18} />
          </button>
        </form>

        <div className="login-footer-note">
          <ShieldCheck size={14} className="login-note-icon" />
          <span>Demo login: your details stay in this browser only.</span>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;

