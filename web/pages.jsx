import React, { useState, useEffect, Suspense, lazy, useRef } from 'react';
import { Routes, Route, Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import Fuse from 'fuse.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeartPulse, faComments, faBookOpen, faChartLine, faUsersCog, faUserShield, faCheckCircle, faExclamationTriangle, faArrowRight, faSearch, faPaperPlane, faRobot, faUser, faClipboardList, faCalendarAlt, faLock } from '@fortawesome/free-solid-svg-icons';
import { Button, Modal, Gauge, Input, Textarea, Card, Spinner, Alert } from './ui.jsx';
import { useAuthStore } from './store.js';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

// --- API Client Setup (using Axios instance from store if defaults are set) ---
const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

// Add a request interceptor to include the token if available
apiClient.interceptors.request.use(config => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, error => {
  return Promise.reject(error);
});


// --- Authentication Components ---
const loginSchema = yup.object({
  email: yup.string().email('Invalid email format').required('Email is required'),
  password: yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
}).required();

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, isLoading, error } = useAuthStore();
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(loginSchema),
  });

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/pro/dashboard'); // Redirect if already logged in
    }
  }, [isAuthenticated, navigate]);

  const onSubmit = async (data) => {
    const success = await login(data.email, data.password);
    if (success) {
      navigate('/pro/dashboard'); // Redirect based on role might be better
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-neutral-light">
      <Card className="w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-6 text-primary">Login</h2>
        {error && <Alert type="error" message={error} className="mb-4" />}
        <form onSubmit={handleSubmit(onSubmit)}>
          <Input
            label="Email"
            name="email"
            type="email"
            error={errors.email?.message}
            {...register('email')}
            disabled={isLoading}
          />
          <Input
            label="Password"
            name="password"
            type="password"
            error={errors.password?.message}
            {...register('password')}
            disabled={isLoading}
          />
          <Button type="submit" variant="primary" className="w-full mt-4" loading={isLoading} disabled={isLoading}>
            {isLoading ? 'Logging in...' : 'Login'}
          </Button>
           <p className="mt-4 text-center text-sm text-neutral-DEFAULT">
              Don't have an account?{' '}
              <Link to="/register" className="font-medium text-primary hover:text-primary-dark">
                Register here
              </Link>
           </p>
        </form>
      </Card>
    </div>
  );
};

const registerSchema = yup.object({
    email: yup.string().email('Invalid email format').required('Email is required'),
    password: yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
    confirmPassword: yup.string()
        .oneOf([yup.ref('password'), null], 'Passwords must match')
        .required('Confirm Password is required'),
}).required();

const RegisterPage = () => {
    const navigate = useNavigate();
    const { register: registerUser, isLoading, error } = useAuthStore();
    const { register, handleSubmit, formState: { errors } } = useForm({
        resolver: yupResolver(registerSchema),
    });
    const [registrationSuccess, setRegistrationSuccess] = useState(false);

    const onSubmit = async (data) => {
        const success = await registerUser(data.email, data.password);
         if (success) {
             setRegistrationSuccess(true);
             // Optionally redirect after a delay or let user click login
             // setTimeout(() => navigate('/login'), 3000);
         }
    };

    if (registrationSuccess) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-neutral-light">
                <Card className="w-full max-w-md text-center">
                    <FontAwesomeIcon icon={faCheckCircle} className="text-green-500 text-5xl mb-4" />
                    <h2 className="text-2xl font-bold mb-4">Registration Successful!</h2>
                    <p className="mb-6">You can now log in with your credentials.</p>
                    <Link to="/login">
                        <Button variant="primary">Go to Login</Button>
                    </Link>
                </Card>
            </div>
        );
    }


    return (
        <div className="flex items-center justify-center min-h-screen bg-neutral-light">
            <Card className="w-full max-w-md">
                <h2 className="text-2xl font-bold text-center mb-6 text-primary">Register</h2>
                {error && <Alert type="error" message={error} className="mb-4" />}
                <form onSubmit={handleSubmit(onSubmit)}>
                    <Input
                        label="Email"
                        name="email"
                        type="email"
                        error={errors.email?.message}
                        {...register('email')}
                        disabled={isLoading}
                    />
                    <Input
                        label="Password"
                        name="password"
                        type="password"
                        error={errors.password?.message}
                        {...register('password')}
                        disabled={isLoading}
                    />
                     <Input
                        label="Confirm Password"
                        name="confirmPassword"
                        type="password"
                        error={errors.confirmPassword?.message}
                        {...register('confirmPassword')}
                        disabled={isLoading}
                    />
                    <Button type="submit" variant="primary" className="w-full mt-4" loading={isLoading} disabled={isLoading}>
                        {isLoading ? 'Registering...' : 'Register'}
                    </Button>
                    <p className="mt-4 text-center text-sm text-neutral-DEFAULT">
                        Already have an account?{' '}
                        <Link to="/login" className="font-medium text-primary hover:text-primary-dark">
                            Login here
                        </Link>
                    </p>
                </form>
            </Card>
        </div>
    );
};


// --- Protected Route Component ---
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, isLoading } = useAuthStore();
  const location = useLocation();

  // Handle loading state from async initAuth or login process
  if (isLoading) {
    return <div className="flex justify-center items-center h-screen"><Spinner size="lg" /></div>;
  }

  if (!isAuthenticated) {
    // Redirect them to the /login page, but save the current location they were
    // trying to go to when they were redirected. This allows us to send them
    // along to that page after they login, which is a nicer user experience
    // than dropping them off on the home page.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
     // Redirect to home or an unauthorized page if role doesn't match
     return <Navigate to="/" replace />;
  }

  return children;
};

// --- Layout Component ---
const Layout = ({ children }) => {
    const { isAuthenticated, user, logout } = useAuthStore();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <div className="min-h-screen flex flex-col">
            <header className="bg-white shadow-sm">
                <nav className="container mx-auto px-4 py-3 flex justify-between items-center">
                    <Link to="/" className="text-xl font-bold text-primary">MindWell Assist</Link>
                    <div className="space-x-4">
                        <Link to="/autoavaliacao" className="text-neutral-dark hover:text-primary">Self-Assessment</Link>
                        <Link to="/chat" className="text-neutral-dark hover:text-primary">Chat Assistant</Link>
                        <Link to="/recursos" className="text-neutral-dark hover:text-primary">Resources</Link>
                        {isAuthenticated && user?.role === 'professional' && (
                             <Link to="/pro/dashboard" className="text-neutral-dark hover:text-primary">Dashboard</Link>
                        )}
                         {isAuthenticated && user?.role === 'admin' && (
                             <Link to="/admin" className="text-neutral-dark hover:text-primary">Admin Panel</Link>
                         )}
                         {isAuthenticated ? (
                             <Button onClick={handleLogout} variant="outline" size="sm">Logout</Button>
                         ) : (
                             <Link to="/login">
                                 <Button variant="primary" size="sm">Login</Button>
                             </Link>
                         )}
                    </div>
                </nav>
            </header>
            <main className="flex-grow container mx-auto px-4 py-8">
                {children}
            </main>
            <footer className="bg-neutral-dark text-neutral-light py-6 mt-12">
                <div className="container mx-auto px-4 text-center">
                    <p>&copy; {new Date().getFullYear()} MindWell Assist. All rights reserved.</p>
                    <div className="mt-2 space-x-4">
                        <Link to="/privacidade" className="hover:text-primary-light">Privacy Policy</Link>
                        {/* Add other footer links as needed */}
                    </div>
                </div>
            </footer>
        </div>
    );
};

// --- Page Components ---

// Home Page
const HomePage = () => {
  return (
    <div>
      {/* Hero Section */}
      <section className="text-center py-16 md:py-24 bg-gradient-to-r from-primary-light to-cyan-600 text-white rounded-lg shadow-lg">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Your Path to Mental Well-being Starts Here</h1>
        <p className="text-lg md:text-xl mb-8 max-w-3xl mx-auto">Understand your feelings, explore resources, and connect with our AI assistant. Confidential and supportive.</p>
        <div className="space-x-4">
          <Link to="/autoavaliacao">
            <Button variant="secondary" size="lg">
              <FontAwesomeIcon icon={faHeartPulse} className="mr-2" />
              Start Self-Assessment
            </Button>
          </Link>
          <Link to="/chat">
            <Button variant="outline" className="bg-white text-primary border-white hover:bg-white/90" size="lg">
               <FontAwesomeIcon icon={faComments} className="mr-2" />
              Chat with Assistant
            </Button>
          </Link>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-16">
        <h2 className="text-3xl font-bold text-center mb-12 text-neutral-dark">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8 text-center">
          <Card>
            <FontAwesomeIcon icon={faClipboardList} size="3x" className="text-primary mb-4" />
            <h3 className="text-xl font-semibold mb-2">1. Assess Yourself</h3>
            <p className="text-neutral-DEFAULT">Take confidential PHQ-9 & GAD-7 questionnaires to understand your current mood and anxiety levels.</p>
          </Card>
          <Card>
            <FontAwesomeIcon icon={faRobot} size="3x" className="text-primary mb-4" />
            <h3 className="text-xl font-semibold mb-2">2. Get Insights & Chat</h3>
            <p className="text-neutral-DEFAULT">Receive instant feedback and risk level. Chat with our AI assistant for support and information.</p>
          </Card>
           <Card>
            <FontAwesomeIcon icon={faBookOpen} size="3x" className="text-primary mb-4" />
            <h3 className="text-xl font-semibold mb-2">3. Explore Resources</h3>
            <p className="text-neutral-DEFAULT">Access curated articles, guides, and tools to help you manage your mental well-being.</p>
          </Card>
        </div>
      </section>

        {/* Counters Section - Placeholder Static Data */}
      <section className="py-12 bg-primary-light rounded-lg my-16">
          <div className="container mx-auto px-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                  <div>
                      <p className="text-4xl font-bold text-primary-dark">10,000+</p>
                      <p className="text-lg text-neutral-dark">Assessments Taken</p>
                  </div>
                   <div>
                      <p className="text-4xl font-bold text-primary-dark">5,000+</p>
                      <p className="text-lg text-neutral-dark">Users Assisted</p>
                  </div>
                  <div>
                      <p className="text-4xl font-bold text-primary-dark">100+</p>
                      <p className="text-lg text-neutral-dark">Helpful Resources</p>
                  </div>
                   <div>
                      <p className="text-4xl font-bold text-primary-dark">95%</p>
                      <p className="text-lg text-neutral-dark">Positive Feedback</p>
                  </div>
              </div>
          </div>
      </section>


      {/* Testimonials Section - Placeholder */}
      <section className="py-16">
         <h2 className="text-3xl font-bold text-center mb-12 text-neutral-dark">What Users Say</h2>
         <div className="grid md:grid-cols-2 gap-8">
            <Card>
                <blockquote className="italic text-neutral-DEFAULT mb-4">"The assessment was quick and insightful. It helped me realize I needed to talk to someone."</blockquote>
                <p className="font-semibold">- Alex P.</p>
            </Card>
             <Card>
                <blockquote className="italic text-neutral-DEFAULT mb-4">"The AI chat provided comforting words when I felt overwhelmed. It's a great first step."</blockquote>
                <p className="font-semibold">- Jamie R.</p>
            </Card>
         </div>
      </section>
    </div>
  );
};

// --- Self-Assessment Page ---

// Questions Data
const phq9Questions = [
  { id: 'q1', text: 'Little interest or pleasure in doing things?' },
  { id: 'q2', text: 'Feeling down, depressed, or hopeless?' },
  { id: 'q3', text: 'Trouble falling or staying asleep, or sleeping too much?' },
  { id: 'q4', text: 'Feeling tired or having little energy?' },
  { id: 'q5', text: 'Poor appetite or overeating?' },
  { id: 'q6', text: 'Feeling bad about yourself — or that you are a failure or have let yourself or your family down?' },
  { id: 'q7', text: 'Trouble concentrating on things, such as reading the newspaper or watching television?' },
  { id: 'q8', text: 'Moving or speaking so slowly that other people could have noticed? Or the opposite — being so fidgety or restless that you have been moving around a lot more than usual?' },
  { id: 'q9', text: 'Thoughts that you would be better off dead, or of hurting yourself in some way?' },
];

const gad7Questions = [
  { id: 'q10', text: 'Feeling nervous, anxious, or on edge?' },
  { id: 'q11', text: 'Not being able to stop or control worrying?' },
  { id: 'q12', text: 'Worrying too much about different things?' },
  { id: 'q13', text: 'Trouble relaxing?' },
  { id: 'q14', text: 'Being so restless that it is hard to sit still?' },
  { id: 'q15', text: 'Becoming easily annoyed or irritable?' },
  { id: 'q16', text: 'Feeling afraid as if something awful might happen?' },
];

const answerOptions = [
  { value: 0, label: 'Not at all' },
  { value: 1, label: 'Several days' },
  { value: 2, label: 'More than half the days' },
  { value: 3, label: 'Nearly every day' },
];

// Yup schema for validation
const assessmentSchema = yup.object().shape(
    Object.fromEntries(
        [...phq9Questions, ...gad7Questions].map(q => [
            q.id,
            yup.number().typeError('Please select an option').required('This field is required').min(0).max(3)
        ])
    )
).required();


const AssessmentPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore(); // Get user info if logged in
  const [step, setStep] = useState(1); // 1: Intro, 2: PHQ9, 3: GAD7, 4: Results, 5: Consent
  const [results, setResults] = useState(null);
  const [showConsentModal, setShowConsentModal] = useState(false);

  const { control, handleSubmit, watch, formState: { errors, isValid } } = useForm({
    resolver: yupResolver(assessmentSchema),
    mode: 'onChange', // Validate on change to enable next button
  });

  const mutation = useMutation({
    mutationFn: (assessmentData) => apiClient.post('/assessments', assessmentData),
    onSuccess: () => {
      console.log("Assessment saved successfully");
      // Optionally show a success message or clear form
      setShowConsentModal(false); // Close modal on success
       alert('Your assessment results have been saved.'); // Simple confirmation
    },
    onError: (error) => {
      console.error("Error saving assessment:", error);
      alert(`Failed to save assessment: ${error.response?.data?.message || error.message}`);
      setShowConsentModal(false); // Close modal on error too
    }
  });

  const calculateResults = (data) => {
    const score_phq = phq9Questions.reduce((sum, q) => sum + (data[q.id] || 0), 0);
    const score_gad = gad7Questions.reduce((sum, q) => sum + (data[q.id] || 0), 0);
    const isSuicidalRisk = (data['q9'] || 0) >= 1;

    let interpretation_phq;
    if (score_phq <= 4) interpretation_phq = 'Minimal depression';
    else if (score_phq <= 9) interpretation_phq = 'Mild depression';
    else if (score_phq <= 14) interpretation_phq = 'Moderate depression';
    else if (score_phq <= 19) interpretation_phq = 'Moderately severe depression';
    else interpretation_phq = 'Severe depression';

    let interpretation_gad;
    if (score_gad <= 4) interpretation_gad = 'Minimal anxiety';
    else if (score_gad <= 9) interpretation_gad = 'Mild anxiety';
    else if (score_gad <= 14) interpretation_gad = 'Moderate anxiety';
    else interpretation_gad = 'Severe anxiety';

    let riskLevel;
    if (score_phq >= 20 || score_gad >= 15 || isSuicidalRisk) {
        riskLevel = 'HIGH';
    } else if (score_phq >= 10 || score_gad >= 10) {
        riskLevel = 'MODERATE';
    } else {
        riskLevel = 'LOW';
    }

    return {
      phqScore: score_phq,
      gadScore: score_gad,
      interpretation_phq,
      interpretation_gad,
      isSuicidalRisk,
      riskLevel,
      answers: data, // Keep original answers
    };
  };

  const onSubmit = (data) => {
    const calculatedResults = calculateResults(data);
    setResults(calculatedResults);
    setStep(4); // Move to results display
  };

  const handleNextStep = () => {
     // Could add specific validation checks per step if needed
    setStep(prev => prev + 1);
  }

  const handleSaveResults = () => {
    if (results) {
      setShowConsentModal(true);
    }
  };

   const handleConsentAndSave = () => {
    if (results) {
      mutation.mutate({
        userId: user?.id || null, // Include userId if logged in, otherwise null
        phqScore: results.phqScore,
        gadScore: results.gadScore,
        riskLevel: results.riskLevel,
        isSuicidalRisk: results.isSuicidalRisk,
        // answers: results.answers, // Optionally send answers (ensure encryption in backend)
        consentGiven: true, // Indicate consent was given
      });
    }
  };


  const renderQuestion = (question) => (
    <div key={question.id} className="mb-6 p-4 border rounded-lg bg-white">
      <label className="block text-md font-medium text-gray-800 mb-3">{question.text}</label>
      <Controller
        name={question.id}
        control={control}
        render={({ field }) => (
          <div className="flex flex-col sm:flex-row sm:space-x-4">
            {answerOptions.map(option => (
              <label key={option.value} className="inline-flex items-center mb-2 sm:mb-0">
                <input
                  type="radio"
                  {...field}
                  value={option.value}
                  checked={field.value === option.value}
                  className="form-radio h-4 w-4 text-primary focus:ring-primary border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">{option.label} ({option.value})</span>
              </label>
            ))}
          </div>
        )}
      />
      {errors[question.id] && <p className="mt-1 text-sm text-danger">{errors[question.id].message}</p>}
    </div>
  );

  const totalQuestions = phq9Questions.length + gad7Questions.length;
  const answeredQuestions = Object.keys(watch()).filter(key => watch(key) !== undefined).length;
  const progress = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;


    // --- Contact Professional Modal ---
    const [isContactModalOpen, setContactModalOpen] = useState(false);
    const contactSchema = yup.object({
        name: yup.string().required('Name is required'),
        contact: yup.string().required('Email or Phone is required'), // Can be email or phone
        message: yup.string().required('Message is required').min(10, 'Message is too short'),
    }).required();
    const { register: registerContact, handleSubmit: handleContactSubmit, formState: { errors: contactErrors }, reset: resetContactForm } = useForm({
        resolver: yupResolver(contactSchema)
    });

    const appointmentMutation = useMutation({
        mutationFn: (appointmentData) => apiClient.post('/appointments', appointmentData),
        onSuccess: () => {
            console.log("Appointment request sent successfully");
            alert('Your request has been sent. A professional may contact you soon.');
            setContactModalOpen(false);
            resetContactForm();
        },
        onError: (error) => {
            console.error("Error sending appointment request:", error);
            alert(`Failed to send request: ${error.response?.data?.message || error.message}`);
        }
    });

    const onContactSubmit = (data) => {
        appointmentMutation.mutate(data);
    };


  return (
    <div className="max-w-3xl mx-auto">
        {step < 4 && (
             <div className="w-full bg-gray-200 rounded-full h-2.5 mb-6 dark:bg-gray-700">
                <div className="bg-primary h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
            </div>
        )}

      {step === 1 && (
        <Card className="text-center">
          <h2 className="text-2xl font-bold mb-4 text-primary">Mental Health Self-Assessment</h2>
          <p className="mb-6 text-neutral-DEFAULT">This tool includes the PHQ-9 (for depression) and GAD-7 (for anxiety) questionnaires. Your responses are confidential. This is not a diagnostic tool, but it can help you understand your feelings.</p>
           <p className="mb-6 text-sm text-neutral-DEFAULT">Over the last <strong>2 weeks</strong>, how often have you been bothered by the following problems?</p>
          <Button onClick={() => setStep(2)} variant="primary" size="lg">
            Start Assessment <FontAwesomeIcon icon={faArrowRight} className="ml-2"/>
          </Button>
        </Card>
      )}

      {step === 2 && (
        <form> {/* No onSubmit here, handled by button */}
          <h3 className="text-xl font-semibold mb-4">Part 1: Depression (PHQ-9)</h3>
          {phq9Questions.map(renderQuestion)}
          <div className="text-right">
            <Button onClick={handleNextStep} variant="primary">
               Next: Anxiety Questions <FontAwesomeIcon icon={faArrowRight} className="ml-2"/>
            </Button>
          </div>
        </form>
      )}

      {step === 3 && (
        <form onSubmit={handleSubmit(onSubmit)}> {/* Submit on final step */}
          <h3 className="text-xl font-semibold mb-4">Part 2: Anxiety (GAD-7)</h3>
          {gad7Questions.map(renderQuestion)}
          <div className="flex justify-between items-center mt-6">
             <Button onClick={() => setStep(2)} variant="outline">Back</Button>
             <Button type="submit" variant="primary" disabled={!isValid}>
                 View Results <FontAwesomeIcon icon={faCheckCircle} className="ml-2"/>
             </Button>
          </div>
        </form>
      )}

      {step === 4 && results && (
        <Card>
          <h2 className="text-2xl font-bold mb-6 text-center text-primary">Your Assessment Results</h2>

          {results.isSuicidalRisk && (
            <Alert type="danger" className="mb-6">
               <div className='flex items-center'>
                    <FontAwesomeIcon icon={faExclamationTriangle} className="text-xl mr-3"/>
                    <div>
                        <p className="font-bold">Important Safety Notice</p>
                        <p>Your answers indicate thoughts of self-harm. If you are in immediate danger, please contact emergency services (e.g., 911, 112) or a crisis hotline immediately. Help is available.</p>
                     </div>
               </div>
            </Alert>
          )}

          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">PHQ-9 Score (Depression)</h3>
               <Gauge id="phq9" value={results.phqScore} maxValue={27} label={results.interpretation_phq} />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">GAD-7 Score (Anxiety)</h3>
              <Gauge id="gad7" value={results.gadScore} maxValue={21} label={results.interpretation_gad} />
            </div>
          </div>

          <div className={`text-center p-4 rounded-lg mb-8 ${
            results.riskLevel === 'HIGH' ? 'bg-red-100 border border-red-300' :
            results.riskLevel === 'MODERATE' ? 'bg-yellow-100 border border-yellow-300' :
            'bg-green-100 border border-green-300'
          }`}>
            <h3 className="text-lg font-semibold">Overall Risk Level:
              <span className={`ml-2 font-bold ${
                results.riskLevel === 'HIGH' ? 'text-red-700' :
                results.riskLevel === 'MODERATE' ? 'text-yellow-700' :
                'text-green-700'
              }`}>{results.riskLevel}</span>
            </h3>
          </div>

          <p className="text-neutral-DEFAULT mb-6">These results are based on your self-reported symptoms over the past two weeks. They are not a diagnosis. Consider discussing these results with a healthcare professional.</p>

          <div className="flex flex-col md:flex-row justify-center gap-4">
            <Button onClick={() => navigate('/chat')} variant="primary">
              <FontAwesomeIcon icon={faComments} className="mr-2"/> Chat with AI Assistant
            </Button>
             <Button onClick={() => setContactModalOpen(true)} variant="secondary">
               <FontAwesomeIcon icon={faUserShield} className="mr-2"/> Seek Professional Help
             </Button>
             <Button onClick={handleSaveResults} variant="outline">
              Save Results (Requires Consent)
            </Button>
          </div>


         {/* Contact Professional Modal */}
          <Modal isOpen={isContactModalOpen} onClose={() => setContactModalOpen(false)} title="Request Professional Contact">
             <form onSubmit={handleContactSubmit(onContactSubmit)}>
                 <p className="text-sm text-neutral-DEFAULT mb-4">Please provide your details. A mental health professional may reach out to you. Your contact information will be kept confidential.</p>
                 <Input
                     label="Your Name"
                     name="name"
                     error={contactErrors.name?.message}
                     {...registerContact('name')}
                     disabled={appointmentMutation.isLoading}
                 />
                  <Input
                     label="Email or Phone Number"
                     name="contact"
                     error={contactErrors.contact?.message}
                     {...registerContact('contact')}
                     disabled={appointmentMutation.isLoading}
                 />
                  <Textarea
                     label="Brief Message (Optional)"
                     name="message"
                     rows={4}
                     error={contactErrors.message?.message}
                     {...registerContact('message')}
                     disabled={appointmentMutation.isLoading}
                 />
                  <div className="mt-4 flex justify-end space-x-2">
                      <Button type="button" variant="ghost" onClick={() => {setContactModalOpen(false); resetContactForm();}} disabled={appointmentMutation.isLoading}>
                          Cancel
                      </Button>
                      <Button type="submit" variant="primary" loading={appointmentMutation.isLoading} disabled={appointmentMutation.isLoading}>
                          {appointmentMutation.isLoading ? 'Sending...' : 'Send Request'}
                      </Button>
                  </div>
             </form>
          </Modal>


        </Card>
      )}

       {/* Consent Modal */}
        <Modal isOpen={showConsentModal} onClose={() => setShowConsentModal(false)} title="Consent to Save Data">
          <div className="text-sm">
            <p className="mb-4">We need your permission to save your assessment results. Here's how your data will be used:</p>
            <ul className="list-disc list-inside mb-4 space-y-1">
              <li>To allow you (if logged in) or professionals (anonymously if not logged in) to track general trends.</li>
              <li>To help improve our services and understand user needs (data is aggregated and anonymized).</li>
              <li>Sensitive details like specific answers may be stored encrypted.</li>
              <li>Data older than 12 months may be automatically anonymized or deleted.</li>
            </ul>
            <p className="mb-4">You can read our full <Link to="/privacidade" className="text-primary underline" target="_blank">Privacy Policy</Link> for more details.</p>
            <p className="font-semibold">Do you consent to saving your assessment results?</p>
          </div>
          <div className="mt-6 flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setShowConsentModal(false)} disabled={mutation.isLoading}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleConsentAndSave} loading={mutation.isLoading} disabled={mutation.isLoading}>
              Yes, I Consent
            </Button>
          </div>
        </Modal>

    </div>
  );
};


// --- Chat Page ---
const ChatPage = () => {
  const [messages, setMessages] = useState([]); // { role: 'user' | 'assistant', content: string }[]
  const [input, setInput] = useState('');
  const { user } = useAuthStore(); // Get user info if logged in
  const messagesEndRef = useRef(null); // To auto-scroll

  const mutation = useMutation({
    mutationFn: (newMessage) => apiClient.post('/chat', { message: newMessage, userId: user?.id }), // Send userId if available
    onSuccess: (response) => {
        setMessages(prev => [...prev, { role: 'assistant', content: response.data.reply }]);
    },
    onError: (error) => {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error. Please try again later." }]);
    },
  });

   const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]); // Scroll whenever messages update

  const handleSend = (e) => {
    e.preventDefault();
    if (input.trim() && !mutation.isLoading) {
      const userMessage = { role: 'user', content: input };
      setMessages(prev => [...prev, userMessage]);
      mutation.mutate(input);
      setInput('');
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] max-w-3xl mx-auto bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-4 border-b bg-primary-light text-primary-dark font-semibold">
         <FontAwesomeIcon icon={faComments} className="mr-2" /> AI Assistant Chat
      </div>
      <div className="flex-grow p-4 overflow-y-auto space-y-4">
        {/* Initial message from bot */}
        {messages.length === 0 && (
             <div className="flex items-start space-x-3">
                 <FontAwesomeIcon icon={faRobot} className="text-primary text-xl mt-1" />
                <div className="bg-gray-100 p-3 rounded-lg max-w-xs sm:max-w-md">
                    <p className="text-sm">Hello! I'm MindGuide, your AI assistant. How can I help you today? You can ask me about mental well-being or how the assessments work.</p>
                </div>
            </div>
        )}
        {/* Chat messages */}
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
             <div className={`flex items-start space-x-3 ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                 <FontAwesomeIcon icon={msg.role === 'user' ? faUser : faRobot} className={`text-xl mt-1 ${msg.role === 'user' ? 'text-secondary-dark' : 'text-primary'}`} />
                 <div className={`${msg.role === 'user' ? 'bg-primary text-white' : 'bg-gray-100 text-neutral-dark'} p-3 rounded-lg max-w-xs sm:max-w-md`}>
                    <p className="text-sm">{msg.content}</p>
                 </div>
            </div>
          </div>
        ))}
         {mutation.isLoading && (
            <div className="flex items-start space-x-3">
                <FontAwesomeIcon icon={faRobot} className="text-primary text-xl mt-1" />
                <div className="bg-gray-100 p-3 rounded-lg inline-flex items-center">
                    <Spinner size="sm" color="neutral" className="mr-2"/>
                    <span className="text-sm italic text-neutral-DEFAULT">MindGuide is thinking...</span>
                </div>
            </div>
        )}
         <div ref={messagesEndRef} /> {/* Anchor for scrolling */}
      </div>
      <form onSubmit={handleSend} className="p-4 border-t flex items-center space-x-2 bg-gray-50">
        <Input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          className="flex-grow !mb-0" // Override margin bottom from default Input
          disabled={mutation.isLoading}
          aria-label="Chat input"
        />
        <Button type="submit" variant="primary" disabled={mutation.isLoading || !input.trim()} className="!px-3 !py-2"> {/* Use ! to override size styles */}
           <FontAwesomeIcon icon={faPaperPlane} />
        </Button>
      </form>
    </div>
  );
};

// --- Resources Page ---
// Static data for now, could be fetched from API: GET /resources
const resourceData = [
  { id: 1, type: 'Article', title: 'Understanding Anxiety', description: 'Learn about the common symptoms and types of anxiety disorders.', content: 'Anxiety is a normal human emotion... (full article content here)' },
  { id: 2, type: 'Article', title: 'Coping Strategies for Low Mood', description: 'Practical tips to help manage feelings of depression or sadness.', content: 'When feeling low, small steps can make a difference... ' },
  { id: 3, type: 'Guide', title: 'Mindfulness Meditation Guide (PDF)', description: 'A step-by-step guide to starting a mindfulness practice.', link: '/resources/mindfulness-guide.pdf' }, // Needs actual PDF
  { id: 4, type: 'Audio', title: '5-Minute Breathing Exercise', description: 'A short guided audio for quick relaxation.', audioSrc: '/audio/breathing-exercise.mp3' }, // Needs actual MP3
  { id: 5, type: 'Article', title: 'The Importance of Sleep for Mental Health', description: 'Explore the connection between sleep quality and emotional well-being.', content: 'Sleep is crucial for...' },
   { id: 6, type: 'External Link', title: 'Crisis Text Line', description: 'Connect with a crisis counselor via text message (USA).', link: 'https://www.crisistextline.org/', external: true },
];

const fuseOptions = {
  keys: ['title', 'description', 'type'],
  threshold: 0.4, // Adjust sensitivity
};

const ResourcesPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredResources, setFilteredResources] = useState(resourceData);
  const [selectedResource, setSelectedResource] = useState(null);
  const [isModalOpen, setModalOpen] = useState(false);
  const audioRef = useRef(null);

   // TODO: Fetch resources from API using React Query
   // const { data: resourceData = [], isLoading, error } = useQuery('resources', () =>
   //   apiClient.get('/resources').then(res => res.data)
   // );

  const fuse = new Fuse(resourceData, fuseOptions);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredResources(resourceData);
    } else {
      const results = fuse.search(searchTerm);
      setFilteredResources(results.map(result => result.item));
    }
  }, [searchTerm, resourceData]); // Re-run search if data or term changes

  const openResource = (resource) => {
    if (resource.external) {
        window.open(resource.link, '_blank', 'noopener,noreferrer');
    } else if (resource.type === 'Article' || resource.type === 'Audio' || resource.type === 'Guide') {
        setSelectedResource(resource);
        setModalOpen(true);
    } else {
        // Handle other types or simple links
        if(resource.link) window.open(resource.link, '_blank', 'noopener,noreferrer');
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedResource(null);
     if (audioRef.current) {
        audioRef.current.pause(); // Stop audio when closing modal
     }
  };

  return (
    <div>
      <h2 className="text-3xl font-bold mb-6 text-primary">Resources Library</h2>
      <p className="mb-8 text-neutral-DEFAULT">Explore articles, guides, and tools to support your mental well-being. Use the search bar to find specific topics.</p>

      <div className="mb-8 relative">
        <Input
          type="search"
          placeholder="Search resources (e.g., anxiety, sleep, meditation)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10" // Add padding for icon
          aria-label="Search resources"
        />
         <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
      </div>

       {/* Add Loading/Error states if fetching data */}
       {/* {isLoading && <div className="text-center"><Spinner size="lg" /></div>}
       {error && <Alert type="error" title="Error loading resources" message={error.message} />} */}

      {filteredResources.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredResources.map(resource => (
                  <Card key={resource.id} className="flex flex-col justify-between hover:shadow-lg transition-shadow">
                      <div>
                          <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full mb-2 ${
                              resource.type === 'Article' ? 'bg-blue-100 text-blue-800' :
                              resource.type === 'Guide' ? 'bg-green-100 text-green-800' :
                              resource.type === 'Audio' ? 'bg-purple-100 text-purple-800' :
                              'bg-gray-100 text-gray-800'
                          }`}>{resource.type}</span>
                          <h3 className="text-lg font-semibold mb-2">{resource.title}</h3>
                          <p className="text-sm text-neutral-DEFAULT mb-4">{resource.description}</p>
                      </div>
                      <Button onClick={() => openResource(resource)} variant="outline" size="sm" className="mt-auto">
                          {resource.external ? 'Visit Link' : 'View Resource'} <FontAwesomeIcon icon={faArrowRight} className="ml-1" />
                      </Button>
                  </Card>
              ))}
          </div>
      ) : (
          <p className="text-center text-neutral-DEFAULT italic">No resources found matching your search.</p>
      )}


      {/* Resource Modal */}
      <Modal isOpen={isModalOpen} onClose={closeModal} title={selectedResource?.title}>
         {selectedResource && (
           <div>
             {selectedResource.type === 'Article' && (
               <div className="prose max-w-none"> {/* Use Tailwind Typography if installed */}
                 {/* Render markdown here if content is markdown */}
                 <p>{selectedResource.content}</p>
               </div>
             )}
             {selectedResource.type === 'Guide' && (
                <div>
                    <p className="mb-4">{selectedResource.description}</p>
                    <a href={selectedResource.link} target="_blank" rel="noopener noreferrer" download>
                         <Button variant="primary">Download Guide (PDF)</Button>
                    </a>
                 </div>
             )}
              {selectedResource.type === 'Audio' && (
                 <div className="text-center">
                    <p className="mb-4">{selectedResource.description}</p>
                    <audio controls ref={audioRef} src={selectedResource.audioSrc} className="w-full">
                         Your browser does not support the audio element.
                     </audio>
                 </div>
              )}
             {/* Add rendering for other types if needed */}
           </div>
         )}
      </Modal>
    </div>
  );
};


// --- Professional Dashboard Page ---
const ProDashboardPage = () => {
    // Fetch data needed for the dashboard
    const { data: stats, isLoading: isLoadingStats, error: errorStats } = useQuery({
       queryKey: ['proStats'],
       queryFn: () => apiClient.get('/stats').then(res => res.data),
       // staleTime: 1000 * 60 * 5, // Cache for 5 mins
    });

    const { data: assessments, isLoading: isLoadingAssessments, error: errorAssessments } = useQuery({
        queryKey: ['recentAssessments'],
        queryFn: () => apiClient.get('/assessments?limit=10&sortBy=createdAt:desc').then(res => res.data), // Fetch recent 10
        // staleTime: 1000 * 60 * 5,
    });

     const { data: appointments, isLoading: isLoadingAppointments, error: errorAppointments } = useQuery({
         queryKey: ['appointments'],
         queryFn: () => apiClient.get('/appointments?status=pending').then(res => res.data), // Fetch pending appointments
         // staleTime: 1000 * 60 * 5,
     });

      // Example mutation to update appointment status
      const queryClient = useQueryClient();
      const updateAppointmentMutation = useMutation({
         mutationFn: ({ id, status }) => apiClient.put(`/appointments/${id}`, { status }),
         onSuccess: () => {
            queryClient.invalidateQueries(['appointments']); // Refetch appointments list
            queryClient.invalidateQueries(['proStats']); // Refetch stats might be affected
         },
         onError: (error) => {
            alert(`Failed to update appointment: ${error.response?.data?.message || error.message}`);
         }
      });

     const handleConfirmAppointment = (id) => {
         updateAppointmentMutation.mutate({ id, status: 'confirmed' });
     };
      const handleCancelAppointment = (id) => {
          updateAppointmentMutation.mutate({ id, status: 'cancelled' });
      };


    if (isLoadingStats || isLoadingAssessments || isLoadingAppointments) {
        return <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>;
    }

     const kpiError = errorStats ? 'Error loading KPIs' : null;
     const assessmentError = errorAssessments ? 'Error loading assessments' : null;
     const appointmentError = errorAppointments ? 'Error loading appointments' : null;

    // Placeholder data if stats are unavailable
    const displayStats = stats || { highRiskToday: 0, totalAssessmentsMonth: 0, newContactsPending: appointments?.length || 0 };

  return (
    <div>
      <h2 className="text-3xl font-bold mb-8 text-primary"><FontAwesomeIcon icon={faChartLine} className="mr-2" />Professional Dashboard</h2>

       {/* KPI Cards */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <Card className={kpiError ? 'border-l-4 border-danger' : ''}>
                 <h3 className="text-lg font-semibold text-neutral-DEFAULT mb-2">High Risk Today</h3>
                 {kpiError ? <p className="text-danger text-sm">{kpiError}</p> : <p className="text-4xl font-bold text-danger">{displayStats.highRiskToday ?? 'N/A'}</p>}
             </Card>
              <Card className={kpiError ? 'border-l-4 border-danger' : ''}>
                 <h3 className="text-lg font-semibold text-neutral-DEFAULT mb-2">Assessments (This Month)</h3>
                 {kpiError ? <p className="text-danger text-sm">{kpiError}</p> : <p className="text-4xl font-bold text-primary">{displayStats.totalAssessmentsMonth ?? 'N/A'}</p>}
             </Card>
             <Card className={appointmentError ? 'border-l-4 border-danger' : ''}>
                 <h3 className="text-lg font-semibold text-neutral-DEFAULT mb-2">Pending Contact Requests</h3>
                  {appointmentError ? <p className="text-danger text-sm">{appointmentError}</p> : <p className="text-4xl font-bold text-secondary-dark">{displayStats.newContactsPending ?? 'N/A'}</p>}
              </Card>
       </div>

       {/* Recent High-Risk Assessments Table */}
       <section className="mb-10">
            <h3 className="text-2xl font-semibold mb-4 text-neutral-dark">Recent Assessments (Prioritizing High Risk)</h3>
            {assessmentError && <Alert type="error" message={assessmentError} />}
             {!assessmentError && (!assessments || assessments.length === 0) && <p className="text-neutral-DEFAULT italic">No recent assessments found.</p>}
             {!assessmentError && assessments && assessments.length > 0 && (
                <Card className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                         <thead className="bg-gray-50">
                             <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Risk Level</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PHQ-9</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">GAD-7</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Suicidal Risk?</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                             </tr>
                         </thead>
                         <tbody className="bg-white divide-y divide-gray-200">
                             {assessments.sort((a, b) => { // Sort to bring HIGH risk first, then by date
                                 const riskOrder = { 'HIGH': 0, 'MODERATE': 1, 'LOW': 2 };
                                 if (riskOrder[a.riskLevel] !== riskOrder[b.riskLevel]) {
                                     return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
                                 }
                                 return new Date(b.createdAt) - new Date(a.createdAt);
                             }).map((assessment) => (
                                 <tr key={assessment.id} className={`${assessment.riskLevel === 'HIGH' ? 'bg-red-50' : assessment.riskLevel === 'MODERATE' ? 'bg-yellow-50' : ''}`}>
                                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(assessment.createdAt).toLocaleDateString()}</td>
                                     <td className="px-6 py-4 whitespace-nowrap">
                                         <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                              assessment.riskLevel === 'HIGH' ? 'bg-red-100 text-red-800' :
                                              assessment.riskLevel === 'MODERATE' ? 'bg-yellow-100 text-yellow-800' :
                                              'bg-green-100 text-green-800'
                                            }`}>{assessment.riskLevel}</span>
                                     </td>
                                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{assessment.phqScore}</td>
                                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{assessment.gadScore}</td>
                                     <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                         {assessment.isSuicidalRisk ? <span className="text-red-600">Yes</span> : 'No'}
                                     </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                         {assessment.User ? assessment.User.email : 'Anonymous'}
                                      </td>
                                 </tr>
                             ))}
                         </tbody>
                    </table>
                 </Card>
             )}
       </section>

        {/* Pending Appointments/Contact Requests */}
        <section>
            <h3 className="text-2xl font-semibold mb-4 text-neutral-dark"><FontAwesomeIcon icon={faCalendarAlt} className="mr-2" />Pending Contact Requests</h3>
            {appointmentError && <Alert type="error" message={appointmentError} />}
             {!appointmentError && (!appointments || appointments.length === 0) && <p className="text-neutral-DEFAULT italic">No pending requests.</p>}
             {!appointmentError && appointments && appointments.length > 0 && (
                <div className="space-y-4">
                    {appointments.map(appt => (
                         <Card key={appt.id}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm text-gray-500">Received: {new Date(appt.createdAt).toLocaleString()}</p>
                                    <p className="font-semibold mt-1">From: {appt.patientName} ({appt.patientContact})</p>
                                    <p className="mt-2 text-sm text-gray-700">{appt.message || 'No message provided.'}</p>
                                </div>
                                 <div className="flex flex-col space-y-2 items-end flex-shrink-0 ml-4">
                                     <Button
                                         variant="primary"
                                         size="sm"
                                         onClick={() => handleConfirmAppointment(appt.id)}
                                         loading={updateAppointmentMutation.isLoading && updateAppointmentMutation.variables?.id === appt.id && updateAppointmentMutation.variables?.status === 'confirmed'}
                                         disabled={updateAppointmentMutation.isLoading}
                                      >
                                         Confirm
                                     </Button>
                                     <Button
                                         variant="danger"
                                         size="sm"
                                          onClick={() => handleCancelAppointment(appt.id)}
                                          loading={updateAppointmentMutation.isLoading && updateAppointmentMutation.variables?.id === appt.id && updateAppointmentMutation.variables?.status === 'cancelled'}
                                          disabled={updateAppointmentMutation.isLoading}
                                      >
                                          Cancel/Reject
                                      </Button>
                                 </div>
                             </div>
                         </Card>
                     ))}
                 </div>
             )}
        </section>

       {/* Add Charts or FullCalendar here later if needed */}
        {/* <section className="mt-10">
            <h3 className="text-2xl font-semibold mb-4 text-neutral-dark">Risk Level Trends</h3>
             Placeholder for Chart.js or Recharts component
            <Card>
                 <p className="text-center p-8 text-neutral-DEFAULT">Chart component to be implemented here.</p>
             </Card>
        </section> */}

    </div>
  );
};

// --- Admin Panel Page ---
const AdminPanelPage = () => {
     const queryClient = useQueryClient();

     // Fetch Users
     const { data: users, isLoading: isLoadingUsers, error: errorUsers, refetch: refetchUsers } = useQuery({
         queryKey: ['adminUsers'],
         queryFn: () => apiClient.get('/admin/users').then(res => res.data)
     });

     // Fetch Logs (example - might need adjustments based on API implementation)
      const { data: logs, isLoading: isLoadingLogs, error: errorLogs } = useQuery({
         queryKey: ['adminLogs'],
         queryFn: () => apiClient.get('/admin/logs?limit=50').then(res => res.data), // Limit logs fetched
         refetchInterval: 30000 // Refetch logs every 30 seconds (optional)
     });


     // --- Mutations ---
     const updateUserMutation = useMutation({
         mutationFn: ({ id, role }) => apiClient.put(`/admin/users/${id}`, { role }),
         onSuccess: () => {
             queryClient.invalidateQueries(['adminUsers']);
             alert('User role updated.');
         },
         onError: (error) => alert(`Error updating user: ${error.response?.data?.message || error.message}`)
     });

     const deleteUserMutation = useMutation({
          mutationFn: (id) => apiClient.delete(`/admin/users/${id}`),
          onSuccess: () => {
              queryClient.invalidateQueries(['adminUsers']);
              alert('User deleted.');
          },
          onError: (error) => alert(`Error deleting user: ${error.response?.data?.message || error.message}`)
      });

       const triggerBackupMutation = useMutation({
           mutationFn: () => apiClient.post('/admin/backup'),
           onSuccess: (data) => alert(`Backup successful: ${data.message || 'OK'}`),
           onError: (error) => alert(`Error triggering backup: ${error.response?.data?.message || error.message}`)
       });

       const triggerAnonymizeMutation = useMutation({
            mutationFn: () => apiClient.post('/admin/anonymize'),
            onSuccess: (data) => alert(`Anonymization task started: ${data.message || 'OK'}`),
            onError: (error) => alert(`Error triggering anonymization: ${error.response?.data?.message || error.message}`)
        });

     // --- Handlers ---
      const handleRoleChange = (userId, newRole) => {
         if (confirm(`Change user ${userId}'s role to ${newRole}?`)) {
             updateUserMutation.mutate({ id: userId, role: newRole });
         }
     };

     const handleDeleteUser = (userId, userEmail) => {
         if (confirm(`Are you sure you want to delete user ${userEmail} (ID: ${userId})? This cannot be undone.`)) {
            deleteUserMutation.mutate(userId);
         }
     };

      const handleTriggerBackup = () => {
         if (confirm('Are you sure you want to trigger a database backup now?')) {
            triggerBackupMutation.mutate();
         }
     };

     const handleTriggerAnonymize = () => {
          if (confirm('Are you sure you want to manually trigger the anonymization process for old data?')) {
              triggerAnonymizeMutation.mutate();
          }
      };


    return (
        <div>
            <h2 className="text-3xl font-bold mb-8 text-primary"><FontAwesomeIcon icon={faUsersCog} className="mr-2" />Admin Panel</h2>

             {/* Action Buttons */}
             <section className="mb-10">
                  <h3 className="text-xl font-semibold mb-4 text-neutral-dark">Administrative Actions</h3>
                  <div className="flex space-x-4">
                     <Button
                         variant="secondary"
                         onClick={handleTriggerBackup}
                         loading={triggerBackupMutation.isLoading}
                         disabled={triggerBackupMutation.isLoading}
                      >
                         Trigger DB Backup Now
                      </Button>
                      <Button
                          variant="warning" // Assuming you add a warning variant or use secondary/danger
                          onClick={handleTriggerAnonymize}
                          loading={triggerAnonymizeMutation.isLoading}
                          disabled={triggerAnonymizeMutation.isLoading}
                       >
                           Trigger Anonymization Now
                       </Button>
                       {/* Add Feature Flag Toggles here if implemented */}
                   </div>
                   {triggerBackupMutation.isError && <Alert type="error" message={triggerBackupMutation.error.message} className="mt-4"/>}
                   {triggerAnonymizeMutation.isError && <Alert type="error" message={triggerAnonymizeMutation.error.message} className="mt-4"/>}
             </section>

            {/* User Management Table */}
            <section className="mb-10">
                <h3 className="text-xl font-semibold mb-4 text-neutral-dark">User Management</h3>
                {isLoadingUsers && <Spinner />}
                {errorUsers && <Alert type="error" title="Error loading users" message={errorUsers.message} />}
                {!isLoadingUsers && !errorUsers && users && (
                    <Card className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {users.map(user => (
                                    <tr key={user.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.id}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.email}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                             {/* Simple Select for role change */}
                                             <select
                                                 value={user.role}
                                                 onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                                 className="text-sm rounded border-gray-300 focus:ring-primary focus:border-primary"
                                                 disabled={updateUserMutation.isLoading && updateUserMutation.variables?.id === user.id}
                                             >
                                                 <option value="user">User</option>
                                                 <option value="professional">Professional</option>
                                                 <option value="admin">Admin</option>
                                             </select>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(user.createdAt).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                             <Button
                                                 variant="danger"
                                                 size="sm"
                                                 onClick={() => handleDeleteUser(user.id, user.email)}
                                                 loading={deleteUserMutation.isLoading && deleteUserMutation.variables === user.id}
                                                 disabled={deleteUserMutation.isLoading}
                                             >
                                                 Delete
                                             </Button>
                                              {/* Add Edit button if more fields are editable */}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Card>
                )}
            </section>

             {/* System Logs */}
             <section>
                  <h3 className="text-xl font-semibold mb-4 text-neutral-dark">Recent System Logs</h3>
                  {isLoadingLogs && <Spinner />}
                  {errorLogs && <Alert type="error" title="Error loading logs" message={errorLogs.message} />}
                  {!isLoadingLogs && !errorLogs && logs && (
                       <Card className="bg-gray-800 text-gray-200 font-mono text-xs p-4 max-h-96 overflow-y-auto">
                          <pre>
                            {logs.length > 0 ? logs.join('\n') : 'No recent logs found.'}
                          </pre>
                       </Card>
                  )}
              </section>

        </div>
    );
};

// --- Privacy Policy Page ---
const PrivacyPolicyPage = () => {
  return (
    <div className="prose max-w-4xl mx-auto"> {/* Using Tailwind Typography for basic styling */}
      <h1 className="text-primary">Privacy Policy & Terms of Use</h1>
      <p><strong>Last Updated:</strong> {new Date().toLocaleDateString()}</p>

      <h2>1. Introduction</h2>
      <p>Welcome to MindWell Assist. We are committed to protecting your privacy and handling your data in an open and transparent manner. This policy details how we collect, use, store, and protect your personal information.</p>

      <h2>2. Information We Collect</h2>
      <ul>
        <li><strong>Account Information:</strong> If you register, we collect your email address and hashed password.</li>
        <li><strong>Assessment Data:</strong> We collect your responses to the PHQ-9 and GAD-7 questionnaires, the calculated scores, and risk level. We ask for your explicit consent before saving this data.</li>
        <li><strong>Chat Data:</strong> Conversations with the AI assistant may be logged for quality assurance and service improvement. User identification (if logged in) may be associated with the chat.</li>
        <li><strong>Contact Requests:</strong> If you use the "Seek Professional Help" form, we collect your name, contact details (email/phone), and message.</li>
        <li><strong>Usage Data:</strong> We may collect anonymous data about how you interact with the website (e.g., pages visited, features used) using standard web analytics tools.</li>
      </ul>

       <h2>3. How We Use Your Information</h2>
      <ul>
          <li>To provide and operate the service (assessments, chat).</li>
          <li>To store assessment results upon your consent.</li>
          <li>To facilitate contact between you and professionals if you request it.</li>
          <li>To improve the website and AI assistant performance (using anonymized or aggregated data).</li>
          <li>To ensure security and prevent abuse.</li>
          <li>To comply with legal obligations.</li>
      </ul>


      <h2>4. Data Storage and Security</h2>
      <ul>
        <li>Your data is stored in a secure database (SQLite file on the server).</li>
        <li>Sensitive information (passwords, specific assessment answers if stored, contact details, messages) is encrypted using industry-standard AES-256 encryption.</li>
        <li>We implement security measures like Helmet, CORS, and rate limiting to protect the API.</li>
        <li>Access to sensitive data is restricted to authorized personnel (professionals, admins) based on their roles.</li>
      </ul>

       <h2>5. Data Retention and Anonymization</h2>
        <ul>
            <li>Assessment data is subject to anonymization after 12 months (User ID and specific answers may be removed).</li>
            <li>You can request deletion of your account and associated data (subject to legal requirements).</li>
            <li>Anonymized and aggregated data may be kept for longer periods for statistical analysis.</li>
        </ul>


      <h2>6. Your Rights (LGPD Compliance)</h2>
       <p>You have the right to:</p>
        <ul>
            <li>Access the personal data we hold about you.</li>
            <li>Correct inaccurate information.</li>
            <li>Request deletion of your data (subject to limitations).</li>
            <li>Withdraw consent for data processing where consent is the basis.</li>
            <li>Request information about data sharing.</li>
            <li>Lodge a complaint with the relevant data protection authority.</li>
        </ul>
       <p>To exercise these rights, please contact us via [Provide Contact Method - e.g., email address].</p>

       <h2>7. Use of Cookies</h2>
        <p>We use necessary cookies for authentication and session management. We may use analytics cookies for usage tracking (you can manage cookie preferences via browser settings).</p>


      <h2>8. Third-Party Services</h2>
       <ul>
          <li><strong>OpenAI:</strong> Chat messages are sent to the OpenAI API (o4-mini model) to generate responses. OpenAI has its own privacy policy regarding data usage. We do not send identifiable personal information (like email) directly within the chat prompt unless you type it.</li>
          {/* List any other third-party services like analytics */}
       </ul>

       <h2>9. Children's Privacy</h2>
        <p>This service is not intended for individuals under the age of 16 (or the applicable age of consent in your jurisdiction). We do not knowingly collect data from children.</p>


      <h2>10. Changes to This Policy</h2>
      <p>We may update this policy from time to time. We will notify you of significant changes by posting the new policy on the website. Your continued use of the service after changes constitutes acceptance.</p>

      <h2>11. Contact Us</h2>
      <p>If you have questions about this policy, please contact us at [Provide Contact Email or Form Link].</p>

       <hr />

       <h2>Terms of Use</h2>
       <ol>
          <li>This website provides tools for self-assessment and general information about mental well-being. It is **not** a substitute for professional medical advice, diagnosis, or treatment.</li>
           <li>Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition. Never disregard professional medical advice or delay in seeking it because of something you have read on this website.</li>
           <li>If you are in crisis or think you may have an emergency, call your doctor or emergency services immediately.</li>
           <li>The AI assistant provides information and support but cannot offer therapy or medical advice.</li>
           <li>You agree not to misuse the service, attempt unauthorized access, or introduce malicious code.</li>
           <li>We reserve the right to modify or discontinue the service at any time.</li>
           <li>Use of this service is at your own risk. We provide it "as is" without warranties of any kind.</li>
       </ol>

    </div>
  );
};

// --- Not Found Page ---
const NotFoundPage = () => {
  return (
    <div className="text-center py-20">
      <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
      <h2 className="text-3xl font-semibold mb-6">Page Not Found</h2>
      <p className="text-neutral-DEFAULT mb-8">Sorry, the page you are looking for does not exist.</p>
      <Link to="/">
        <Button variant="primary">Go Back Home</Button>
      </Link>
    </div>
  );
};


// --- Main Router ---
function Pages() {
  return (
     <Layout>
        <Suspense fallback={<div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/autoavaliacao" element={<AssessmentPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/recursos" element={<ResourcesPage />} />
            <Route path="/privacidade" element={<PrivacyPolicyPage />} />
            <Route path="/login" element={<LoginPage />} />
             <Route path="/register" element={<RegisterPage />} />

            {/* Protected Routes */}
            <Route
              path="/pro/dashboard"
              element={
                <ProtectedRoute allowedRoles={['professional', 'admin']}>
                  <ProDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminPanelPage />
                </ProtectedRoute>
              }
            />

             {/* Catch-all for 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
    </Layout>
  );
}

export default Pages;
