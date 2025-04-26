import React, { useState, useEffect, Suspense, lazy, useRef } from 'react';
import { Routes, Route, Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import Fuse from 'fuse.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeartPulse, faComments, faBookOpen, faChartLine, faUsersCog, faUserShield, faCheckCircle, faExclamationTriangle, faArrowRight, faSearch, faPaperPlane, faRobot, faUser, faClipboardList, faCalendarAlt, faLock, faArrowLeft, faDownload, faHistory } from '@fortawesome/free-solid-svg-icons'; // Added faHistory
// Removido RecursoLayout de ui.jsx, pois será definido aqui ou importado de outro lugar se refatorado
import { Button, Modal, Gauge, Input, Textarea, Card, Spinner, Alert } from './ui.jsx';
import { useAuthStore } from './store.js';

// Importações das imagens dos artigos/guias (Ajuste o caminho se necessário)
import anxietyComparisonDiagram from './public/images/anxiety_comparison_diagram.png';
import anxietySymptomsIllustration from './public/images/anxiety_symptoms_illustration.png';
import anxietyTypesIcons from './public/images/anxiety_types_icons.png';
import lowMoodVsDepressionChart from './public/images/low_mood_vs_depression_chart.png';
import outdoorWalkPerson from './public/images/outdoor_walk_person.png'; // Mudado para jpg se for o caso
import healthyFoodPhoto from './public/images/healthy_food_photo.png'; // Mudado para jpg se for o caso
import supportTherapyIllustration from './public/images/support_therapy_illustration.png';
import mindfulnessBenefitsIcons from './public/images/mindfulness_benefits_icons.png';
import meditationPostureIllustration from './public/images/meditation_posture_illustration.png';
import mindfulnessGuidePdfCover from './public/images/mindfulness_guide_pdf_cover.png';
import brainSleepActivityIllustration from './public/images/brain_sleep_activity_illustration.png';
import sleepMentalHealthCycleDiagram from './public/images/sleep_mental_health_cycle_diagram.png';
import bedtimeRoutineIcons from './public/images/bedtime_routine_icons.png';


const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

// --- API Client Setup ---
const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

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
// LoginPage, RegisterPage, ProtectedRoute (sem alterações)
// ... (código existente para Login, Register, ProtectedRoute) ...
const loginSchema = yup.object({
  email: yup.string().email('Formato de e-mail inválido').required('E-mail é obrigatório'),
  password: yup.string().min(6, 'A senha deve ter pelo menos 6 caracteres').required('Senha é obrigatória'),
}).required();

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, isLoading, error, clearError } = useAuthStore();
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(loginSchema),
  });

  useEffect(() => {
    clearError();
    if (isAuthenticated) {
      navigate('/pro/dashboard');
    }
  }, [isAuthenticated, navigate, clearError]);

  const onSubmit = async (data) => {
    const success = await login(data.email, data.password);
    if (success) {
      navigate('/pro/dashboard');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-neutral-light">
      <Card className="w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-6 text-primary">Entrar</h2>
        {error && <Alert type="error" message={error} className="mb-4" />}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Email"
            name="email"
            type="email"
            error={errors.email?.message}
            {...register('email')}
            disabled={isLoading}
            aria-invalid={errors.email ? "true" : "false"}
          />
          <Input
            label="Senha"
            name="password"
            type="password"
            error={errors.password?.message}
            {...register('password')}
            disabled={isLoading}
            aria-invalid={errors.password ? "true" : "false"}
          />
          <Button type="submit" variant="primary" className="w-full mt-4" loading={isLoading} disabled={isLoading}>
            {isLoading ? 'Entrando...' : 'Entrar'}
          </Button>
          <p className="mt-4 text-center text-sm text-neutral-DEFAULT">
            Não tem uma conta?{' '}
            <Link to="/register" className="font-medium text-primary hover:text-primary-dark">
              Registre-se aqui
            </Link>
          </p>
        </form>
      </Card>
    </div>
  );
};

const registerSchema = yup.object({
  email: yup.string().email('Formato de e-mail inválido').required('E-mail é obrigatório'),
  password: yup.string().min(6, 'A senha deve ter pelo menos 6 caracteres').required('Senha é obrigatória'),
  confirmPassword: yup.string()
    .oneOf([yup.ref('password'), null], 'As senhas devem ser iguais')
    .required('Confirmar Senha é obrigatório'),
}).required();

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register: registerUser, isLoading, error, clearError } = useAuthStore();
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(registerSchema),
  });
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  useEffect(() => {
    clearError();
  }, [clearError]);

  const onSubmit = async (data) => {
    const success = await registerUser(data.email, data.password);
    if (success) {
      setRegistrationSuccess(true);
    }
  };

  if (registrationSuccess) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-light">
        <Card className="w-full text-center">
          <FontAwesomeIcon icon={faCheckCircle} className="text-green-500 text-5xl mb-4" />
          <h2 className="text-2xl font-bold mb-4">Registro Concluído com Sucesso!</h2>
          <p className="mb-6">Agora você pode entrar com suas credenciais.</p>
          <Link to="/login">
            <Button variant="primary">Ir para Login</Button>
          </Link>
        </Card>
      </div>
    );
  }


  return (
    <div className="flex items-center justify-center min-h-screen bg-neutral-light">
      <Card className="w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-6 text-primary">Registrar</h2>
        {error && <Alert type="error" message={error} className="mb-4" />}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Email"
            name="email"
            type="email"
            error={errors.email?.message}
            {...register('email')}
            disabled={isLoading}
             aria-invalid={errors.email ? "true" : "false"}
          />
          <Input
            label="Senha"
            name="password"
            type="password"
            error={errors.password?.message}
            {...register('password')}
            disabled={isLoading}
            aria-invalid={errors.password ? "true" : "false"}
          />
          <Input
            label="Confirmar Senha"
            name="confirmPassword"
            type="password"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
            disabled={isLoading}
             aria-invalid={errors.confirmPassword ? "true" : "false"}
          />
          <Button type="submit" variant="primary" className="w-full mt-4" loading={isLoading} disabled={isLoading}>
            {isLoading ? 'Registrando...' : 'Registrar'}
          </Button>
          <p className="mt-4 text-center text-sm text-neutral-DEFAULT">
            Já tem uma conta?{' '}
            <Link to="/login" className="font-medium text-primary hover:text-primary-dark">
              Entre aqui
            </Link>
          </p>
        </form>
      </Card>
    </div>
  );
};


const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen"><Spinner size="lg" /></div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && (!user || !user.role || !allowedRoles.includes(user.role))) {
    console.warn(`ProtectedRoute: User role '${user?.role}' not in allowed roles [${allowedRoles.join(', ')}]. Redirecting.`);
    return <Navigate to="/" replace />;
  }

  return children;
};


// --- Layout Component (sem alterações) ---
const Layout = ({ children }) => {
  const { isAuthenticated, user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <nav className="container mx-auto px-4 py-3 flex justify-between items-center">
          <Link to="/" className="text-xl font-bold text-primary">MindWell Assist</Link>
          <div className="space-x-4 flex items-center">
            <Link to="/autoavaliacao" className="text-neutral-dark hover:text-primary">Autoavaliação</Link>
            <Link to="/chat" className="text-neutral-dark hover:text-primary">Assistente de Chat</Link>
            <Link to="/recursos" className="text-neutral-dark hover:text-primary">Recursos</Link>
            {isAuthenticated && user?.role === 'professional' && (
              <Link to="/pro/dashboard" className="text-neutral-dark hover:text-primary">Painel Pro</Link>
            )}
            {isAuthenticated && user?.role === 'admin' && (
              <Link to="/admin" className="text-neutral-dark hover:text-primary">Admin</Link>
            )}
            {isAuthenticated ? (
              <Button onClick={handleLogout} variant="outline" size="sm">Sair</Button>
            ) : (
              <Link to="/login">
                <Button variant="primary" size="sm">Entrar</Button>
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
          <p>&copy; {new Date().getFullYear()} MindWell Assist. Todos os direitos reservados.</p>
          <div className="mt-2 space-x-4">
            <Link to="/privacidade" className="hover:text-primary-light">Política de Privacidade</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

// --- Page Components ---

// HomePage (sem alterações)
// ... (código existente da HomePage) ...
const HomePage = () => {
  return (
    <div>
      {/* Hero Section */}
      <section className="text-center py-16 md:py-24 bg-gradient-to-r from-primary-light to-cyan-600 text-white rounded-lg shadow-lg">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Sua Jornada para o Bem-Estar Mental Começa Aqui</h1>
        <p className="text-lg md:text-xl mb-8 max-w-3xl mx-auto">Entenda seus sentimentos, explore recursos e conecte-se com nosso assistente de IA. Confidencial e acolhedor.</p>
        <div className="space-x-4">
          <Link to="/autoavaliacao">
            <Button variant="secondary" size="lg">
              <FontAwesomeIcon icon={faHeartPulse} className="mr-2" />
              Iniciar Autoavaliação
            </Button>
          </Link>
          <Link to="/chat">
            <Button variant="outline" className="bg-white text-primary border-white hover:bg-white/90" size="lg">
              <FontAwesomeIcon icon={faComments} className="mr-2" />
              Conversar com Assistente
            </Button>
          </Link>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-16">
        <h2 className="text-3xl font-bold text-center mb-12 text-neutral-dark">Como Funciona</h2>
        <div className="grid md:grid-cols-3 gap-8 text-center">
          <Card>
            <FontAwesomeIcon icon={faClipboardList} size="3x" className="text-primary mb-4" />
            <h3 className="text-xl font-semibold mb-2">1. Avalie-se</h3>
            <p className="text-neutral-DEFAULT">Responda aos questionários confidenciais PHQ-9 e GAD-7 para entender seus níveis atuais de humor e ansiedade.</p>
          </Card>
          <Card>
            <FontAwesomeIcon icon={faRobot} size="3x" className="text-primary mb-4" />
            <h3 className="text-xl font-semibold mb-2">2. Obtenha Insights e Converse</h3>
            <p className="text-neutral-DEFAULT">Receba feedback instantâneo e o nível de risco. Converse com nosso assistente de IA para apoio e informação.</p>
          </Card>
          <Card>
            <FontAwesomeIcon icon={faBookOpen} size="3x" className="text-primary mb-4" />
            <h3 className="text-xl font-semibold mb-2">3. Explore Recursos</h3>
            <p className="text-neutral-DEFAULT">Acesse artigos, guias e ferramentas selecionados para ajudar a gerenciar seu bem-estar mental.</p>
          </Card>
        </div>
      </section>

      {/* Counters Section - Placeholder Static Data */}
      <section className="py-12 bg-primary-light rounded-lg my-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-4xl font-bold text-primary-dark">10,000+</p>
              <p className="text-lg text-neutral-dark">Avaliações Realizadas</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-primary-dark">5,000+</p>
              <p className="text-lg text-neutral-dark">Usuários Atendidos</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-primary-dark">100+</p>
              <p className="text-lg text-neutral-dark">Recursos Úteis</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-primary-dark">95%</p>
              <p className="text-lg text-neutral-dark">Feedback Positivo</p>
            </div>
          </div>
        </div>
      </section>


      {/* Testimonials Section - Placeholder */}
      <section className="py-16">
        <h2 className="text-3xl font-bold text-center mb-12 text-neutral-dark">O Que os Usuários Dizem</h2>
        <div className="grid md:grid-cols-2 gap-8">
          <Card>
            <blockquote className="italic text-neutral-DEFAULT mb-4">"A avaliação foi rápida e esclarecedora. Ajudou-me a perceber que precisava conversar com alguém."</blockquote>
            <p className="font-semibold">- Alex P.</p>
          </Card>
          <Card>
            <blockquote className="italic text-neutral-DEFAULT mb-4">"O chat de IA ofereceu palavras de conforto quando me senti sobrecarregado. É um ótimo primeiro passo."</blockquote>
            <p className="font-semibold">- Jamie R.</p>
          </Card>
        </div>
      </section>
    </div>
  );
};

// --- Self-Assessment Page (sem alterações na lógica, apenas render) ---
// ... (código existente da AssessmentPage) ...
const phq9Questions = [
  { id: 'q1', text: 'Pouco interesse ou prazer em fazer as coisas?' },
  { id: 'q2', text: 'Sentir-se para baixo, deprimido(a) ou sem esperança?' },
  { id: 'q3', text: 'Dificuldade para adormecer ou permanecer dormindo, ou dormir demais?' },
  { id: 'q4', text: 'Sentir-se cansado(a) ou com pouca energia?' },
  { id: 'q5', text: 'Apetite ruim ou comer em excesso?' },
  { id: 'q6', text: 'Sentir-se mal consigo mesmo(a) — ou que você é um fracasso ou decepcionou a si mesmo(a) ou sua família?' },
  { id: 'q7', text: 'Dificuldade para se concentrar nas coisas, como ler o jornal ou assistir televisão?' },
  { id: 'q8', text: 'Mover-se ou falar tão lentamente que outras pessoas poderiam ter notado? Ou o oposto — estar tão agitado(a) ou inquieto(a) que você tem se movimentado muito mais do que o habitual?' },
  { id: 'q9', text: 'Pensamentos de que seria melhor estar morto(a), ou de se machucar de alguma forma?' },
];

const gad7Questions = [
  { id: 'q10', text: 'Sentir-se nervoso(a), ansioso(a) ou no limite?' },
  { id: 'q11', text: 'Não ser capaz de parar ou controlar as preocupações?' },
  { id: 'q12', text: 'Preocupar-se demais com coisas diferentes?' },
  { id: 'q13', text: 'Dificuldade para relaxar?' },
  { id: 'q14', text: 'Ficar tão inquieto(a) que é difícil ficar parado(a)?' },
  { id: 'q15', text: 'Tornar-se facilmente irritado(a) ou aborrecido(a)?' },
  { id: 'q16', text: 'Sentir medo como se algo terrível pudesse acontecer?' },
];

const answerOptions = [
  { value: 0, label: 'Nenhuma vez' },
  { value: 1, label: 'Vários dias' },
  { value: 2, label: 'Mais da metade dos dias' },
  { value: 3, label: 'Quase todos os dias' },
];

const assessmentSchema = yup.object().shape(
  Object.fromEntries(
    [...phq9Questions, ...gad7Questions].map(q => [
      q.id,
      yup.number().typeError('Por favor, selecione uma opção').required('Este campo é obrigatório').min(0).max(3)
    ])
  )
).required();


const AssessmentPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuthStore(); // Get user info and auth status
  const [step, setStep] = useState(0); // 0: History/Intro, 1: PHQ9, 2: GAD7, 3: Results, 4: Consent
  const [results, setResults] = useState(null);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [assessmentStarted, setAssessmentStarted] = useState(false); // <<< Novo estado

  const { control, handleSubmit, watch, reset, formState: { errors, isValid, dirtyFields } } = useForm({
    resolver: yupResolver(assessmentSchema),
    mode: 'onChange', // Validate on change to enable next button
    defaultValues: {}, // Start with empty default values
  });

  // Fetch Assessment History
  const { data: assessmentHistory, isLoading: isLoadingHistory, error: historyError } = useQuery({
    queryKey: ['assessmentHistory', user?.id], // Include user ID in key
    queryFn: () => apiClient.get('/assessments/history').then(res => res.data),
    enabled: isAuthenticated && step === 0, // Only fetch if logged in and on the intro step
  });

  const saveMutation = useMutation({
    mutationFn: (assessmentData) => apiClient.post('/assessments', assessmentData),
    onSuccess: (data) => {
      console.log("Avaliação salva com sucesso:", data);
      setShowConsentModal(false); // Close modal on success
      queryClient.invalidateQueries({ queryKey: ['assessmentHistory', user?.id] });
       queryClient.invalidateQueries({ queryKey: ['latestAssessment', user?.id] });
      alert('Os resultados da sua avaliação foram salvos.');
    },
    onError: (error) => {
      console.error("Erro ao salvar avaliação:", error);
      alert(`Falha ao salvar avaliação: ${error.response?.data?.message || error.message}`);
      setShowConsentModal(false); // Close modal on error too
    }
  });

  const calculateResults = (data) => {
    const score_phq = phq9Questions.reduce((sum, q) => sum + (Number(data[q.id]) || 0), 0);
    const score_gad = gad7Questions.reduce((sum, q) => sum + (Number(data[q.id]) || 0), 0);
    const isSuicidalRisk = (Number(data['q9']) || 0) >= 1;

    let interpretation_phq;
    if (score_phq <= 4) interpretation_phq = 'Depressão mínima';
    else if (score_phq <= 9) interpretation_phq = 'Depressão leve';
    else if (score_phq <= 14) interpretation_phq = 'Depressão moderada';
    else if (score_phq <= 19) interpretation_phq = 'Depressão moderadamente severa';
    else interpretation_phq = 'Depressão severa';

    let interpretation_gad;
    if (score_gad <= 4) interpretation_gad = 'Ansiedade mínima';
    else if (score_gad <= 9) interpretation_gad = 'Ansiedade leve';
    else if (score_gad <= 14) interpretation_gad = 'Ansiedade moderada';
    else interpretation_gad = 'Ansiedade severa';

    let riskLevel;
    if (score_phq >= 20 || score_gad >= 15 || isSuicidalRisk) riskLevel = 'HIGH';
    else if (score_phq >= 10 || score_gad >= 10) riskLevel = 'MODERATE';
    else riskLevel = 'LOW';

    const numericAnswers = Object.fromEntries(
        Object.entries(data).map(([key, value]) => [key, Number(value)])
    );

    return {
      phqScore: score_phq,
      gadScore: score_gad,
      interpretation_phq,
      interpretation_gad,
      isSuicidalRisk,
      riskLevel,
      answers: numericAnswers,
      submittedAt: new Date(),
    };
  };

  const onSubmit = (data) => {
    const calculatedResults = calculateResults(data);
    setResults(calculatedResults);
    setStep(3);
  };

  const handleStartAssessment = () => {
    setResults(null);
    reset({});
    setAssessmentStarted(true);
    setStep(1);
  };

  const handleNextStep = () => {
    setStep(prev => prev + 1);
  };

    const handleBackStep = () => {
      setStep(prev => prev - 1);
    };

  const handleSaveResults = () => {
    if (results) {
      setShowConsentModal(true);
    }
  };

  const handleConsentAndSave = () => {
    if (results) {
      saveMutation.mutate({
        userId: isAuthenticated ? user?.id : null,
        phqScore: results.phqScore,
        gadScore: results.gadScore,
        riskLevel: results.riskLevel,
        isSuicidalRisk: results.isSuicidalRisk,
        consentGiven: true,
      });
    }
  };

   useEffect(() => {
       if (step === 0) {
           setAssessmentStarted(false);
       }
   }, [step]);


  const renderQuestion = (question) => (
    <div key={question.id} className="mb-6 p-4 border rounded-lg bg-white transition-colors duration-200 ease-in-out focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
      <fieldset>
           <legend className="block text-md font-medium text-gray-800 mb-3">{question.text}</legend>
            <Controller
                name={question.id}
                control={control}
                render={({ field }) => (
                    <div className="flex flex-col sm:flex-row sm:space-x-4 sm:items-center" role="radiogroup">
                        {answerOptions.map(option => (
                            <label key={`${question.id}-${option.value}`} className="inline-flex items-center mb-2 sm:mb-0 cursor-pointer p-2 rounded hover:bg-primary/10 transition-colors">
                                <input
                                    type="radio"
                                    {...field}
                                    value={option.value}
                                    checked={String(field.value) === String(option.value)}
                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                    className="appearance-none form-radio h-4 w-4 border-gray-400 checked:bg-primary focus:ring-primary focus:ring-offset-0 transition duration-150 ease-in-out"
                                    aria-describedby={`${question.id}-error`}
                                />
                                <span className="ml-2 text-sm text-gray-700">{option.label} ({option.value})</span>
                            </label>
                        ))}
                    </div>
                )}
            />
           {errors[question.id] && <p id={`${question.id}-error`} className="mt-1 text-sm text-danger">{errors[question.id].message}</p>}
       </fieldset>
    </div>
  );

  const totalQuestions = phq9Questions.length + gad7Questions.length;
   const answeredCount = Object.keys(dirtyFields).filter(key => key.startsWith('q')).length;
  const progress = assessmentStarted && totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;


  const [isContactModalOpen, setContactModalOpen] = useState(false);
  const contactSchema = yup.object({
    name: yup.string().required('Nome é obrigatório'),
    contact: yup.string().required('E-mail ou Telefone é obrigatório'),
    message: yup.string().min(10, 'A mensagem deve ter pelo menos 10 caracteres se fornecida.').optional(),
  }).required();
  const { register: registerContact, handleSubmit: handleContactSubmit, formState: { errors: contactErrors }, reset: resetContactForm } = useForm({
    resolver: yupResolver(contactSchema)
  });

  const appointmentMutation = useMutation({
    mutationFn: (appointmentData) => apiClient.post('/appointments', appointmentData),
    onSuccess: () => {
      console.log("Solicitação de agendamento enviada com sucesso");
      alert('Sua solicitação foi enviada. Um profissional pode entrar em contato em breve.');
      setContactModalOpen(false);
      resetContactForm();
    },
    onError: (error) => {
      console.error("Erro ao enviar solicitação de agendamento:", error);
      alert(`Falha ao enviar solicitação: ${error.response?.data?.message || error.message}`);
    }
  });

  const onContactSubmit = (data) => {
    appointmentMutation.mutate(data);
  };

  return (
    <div className="max-w-3xl mx-auto">
      {assessmentStarted && step >= 1 && step <= 2 && (
        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-6 dark:bg-gray-700">
          <div className="bg-primary h-2.5 rounded-full transition-all duration-500 ease-out" style={{ width: `${progress}%` }}></div>
        </div>
      )}

      {step === 0 && (
        <>
          <Card className="mb-8">
              <h2 className="text-2xl font-bold mb-4 text-primary">Autoavaliação de Saúde Mental</h2>
              <p className="mb-4 text-neutral-DEFAULT">Esta ferramenta inclui os questionários PHQ-9 (para depressão) e GAD-7 (para ansiedade). Suas respostas são confidenciais.</p>
              <p className="mb-6 text-neutral-DEFAULT">Não é uma ferramenta de diagnóstico, mas pode ajudá-lo(a) a entender seus sentimentos e acompanhar suas mudanças ao longo do tempo.</p>
              <p className="mb-6 text-sm text-neutral-DEFAULT">Pense em como você tem se sentido nas últimas <strong>2 semanas</strong>.</p>
              <Button onClick={handleStartAssessment} variant="primary" size="lg">
                Iniciar Nova Avaliação <FontAwesomeIcon icon={faArrowRight} className="ml-2" />
              </Button>
          </Card>

          {isAuthenticated && (
            <Card>
              <h3 className="text-xl font-semibold mb-4 text-neutral-dark flex items-center">
                <FontAwesomeIcon icon={faHistory} className="mr-3 text-primary" />
                Seu Histórico de Avaliações
              </h3>
              {isLoadingHistory && <Spinner />}
              {historyError && <Alert type="error" message="Não foi possível carregar seu histórico." />}
              {!isLoadingHistory && !historyError && (
                assessmentHistory && assessmentHistory.length > 0 ? (
                  <ul className="space-y-3">
                    {assessmentHistory.map((item) => (
                      <li key={item.id} className="p-3 border rounded-md bg-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center">
                         <div>
                            <p className="text-sm font-medium text-neutral-dark">
                                Realizada em: {new Date(item.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <p className="text-xs text-neutral-DEFAULT mt-1">
                                PHQ-9: {item.phqScore} | GAD-7: {item.gadScore} | Risco:
                                <span className={`ml-1 font-semibold ${item.riskLevel === 'HIGH' ? 'text-danger' : item.riskLevel === 'MODERATE' ? 'text-yellow-600' : 'text-green-600'}`}>
                                    {item.riskLevel === 'HIGH' ? 'ALTO' : item.riskLevel === 'MODERATE' ? 'MODERADO' : 'BAIXO'}
                                </span>
                                {item.isSuicidalRisk && <span className="ml-2 text-danger font-bold">(Risco Suicida Indicado)</span>}
                            </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-neutral-DEFAULT italic">Você ainda não completou nenhuma avaliação.</p>
                )
              )}
            </Card>
          )}
           {!isAuthenticated && (
               <Alert type="info" title="Histórico de Avaliações" message="Faça login para salvar e visualizar seu histórico de avaliações." className="mt-6"/>
           )}
        </>
      )}

      {step === 1 && (
        <form>
          <h3 className="text-xl font-semibold mb-4">Parte 1/2: Humor e Interesse (PHQ-9)</h3>
          {phq9Questions.map(renderQuestion)}
          <div className="flex justify-between items-center mt-6">
             <Button onClick={() => { setStep(0); setAssessmentStarted(false); }} variant="outline">Voltar</Button>
             <Button onClick={handleNextStep} variant="primary" disabled={!phq9Questions.every(q => dirtyFields[q.id])}>
               Próximo: Ansiedade <FontAwesomeIcon icon={faArrowRight} className="ml-2" />
            </Button>
          </div>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleSubmit(onSubmit)}>
          <h3 className="text-xl font-semibold mb-4">Parte 2/2: Preocupação e Ansiedade (GAD-7)</h3>
          {gad7Questions.map(renderQuestion)}
          <div className="flex justify-between items-center mt-6">
            <Button onClick={handleBackStep} variant="outline">Voltar</Button>
            <Button type="submit" variant="primary" disabled={!isValid}>
              Ver Resultados <FontAwesomeIcon icon={faCheckCircle} className="ml-2" />
            </Button>
          </div>
        </form>
      )}

      {step === 3 && results && (
        <Card>
          <h2 className="text-2xl font-bold mb-6 text-center text-primary">Resultados da Sua Avaliação</h2>
          <p className="text-center text-sm text-neutral-DEFAULT mb-6 -mt-4">Concluída em: {results.submittedAt.toLocaleString('pt-BR')}</p>

          {results.isSuicidalRisk && (
            <Alert type="danger" className="mb-6">
              <div className='flex items-start'>
                <FontAwesomeIcon icon={faExclamationTriangle} className="text-xl mr-3 mt-1" />
                <div>
                  <p className="font-bold">Aviso Importante de Segurança</p>
                  <p>Suas respostas indicam pensamentos sobre se machucar. Se você estiver em perigo imediato ou precisar de apoio urgente, entre em contato com os serviços de emergência (190, 192) ou o CVV ( disque 188 ou acesse cvv.org.br). A ajuda está disponível.</p>
                </div>
              </div>
            </Alert>
          )}

          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Pontuação PHQ-9 (Depressão)</h3>
              <Gauge id="phq9" value={results.phqScore} maxValue={27} label={results.interpretation_phq} />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Pontuação GAD-7 (Ansiedade)</h3>
              <Gauge id="gad7" value={results.gadScore} maxValue={21} label={results.interpretation_gad} />
            </div>
          </div>

          <div className={`text-center p-4 rounded-lg mb-8 border ${results.riskLevel === 'HIGH' ? 'bg-red-100 border-red-300' :
            results.riskLevel === 'MODERATE' ? 'bg-yellow-100 border-yellow-300' :
              'bg-green-100 border-green-300'
            }`}>
            <h3 className="text-lg font-semibold">Nível de Risco Geral Sugerido:
              <span className={`ml-2 font-bold ${results.riskLevel === 'HIGH' ? 'text-red-700' :
                results.riskLevel === 'MODERATE' ? 'text-yellow-700' :
                  'text-green-700'
                }`}>{results.riskLevel === 'HIGH' ? 'ALTO' : results.riskLevel === 'MODERATE' ? 'MODERADO' : 'BAIXO'}</span>
            </h3>
          </div>

          <p className="text-neutral-DEFAULT mb-6">Lembre-se: Estes resultados baseiam-se nos sintomas que relatou nas últimas duas semanas. Eles <strong>não são um diagnóstico</strong>. Considere discutir estes resultados com um profissional de saúde ou utilizar nosso assistente de chat para mais informações.</p>

           <div className="flex flex-col md:flex-row justify-center gap-4 mt-8 flex-wrap">
                <Button onClick={handleStartAssessment} variant="outline" size="sm">
                    <FontAwesomeIcon icon={faHistory} className="mr-2" /> Fazer Nova Avaliação
                </Button>
                 <Button onClick={() => navigate('/chat')} variant="primary" size="sm">
                    <FontAwesomeIcon icon={faComments} className="mr-2" /> Conversar com Assistente
                </Button>
                <Button onClick={() => setContactModalOpen(true)} variant="secondary" size="sm">
                    <FontAwesomeIcon icon={faUserShield} className="mr-2" /> Buscar Ajuda Profissional
                </Button>
                {isAuthenticated && (
                    <Button onClick={handleSaveResults} variant="outline" size="sm" loading={saveMutation.isLoading} disabled={saveMutation.isLoading}>
                       Salvar Resultados
                    </Button>
                )}
                 {!isAuthenticated && (
                    <Tooltip text="Faça login para salvar seus resultados e acompanhar seu histórico">
                         <Button variant="outline" size="sm" disabled={true}>
                             Salvar Resultados (Requer Login)
                         </Button>
                    </Tooltip>
                 )}
            </div>

          <Modal isOpen={isContactModalOpen} onClose={() => setContactModalOpen(false)} title="Solicitar Contato Profissional">
            <form onSubmit={handleContactSubmit(onContactSubmit)} className="space-y-4">
              <p className="text-sm text-neutral-DEFAULT mb-4">Forneça seus detalhes para que um profissional de saúde mental possa entrar em contato. Suas informações serão tratadas com confidencialidade.</p>
              <Input
                label="Seu Nome"
                name="name"
                error={contactErrors.name?.message}
                {...registerContact('name')}
                disabled={appointmentMutation.isLoading}
              />
              <Input
                label="E-mail ou Número de Telefone"
                name="contact"
                error={contactErrors.contact?.message}
                {...registerContact('contact')}
                disabled={appointmentMutation.isLoading}
              />
              <Textarea
                label="Mensagem Breve (Opcional)"
                name="message"
                rows={3}
                placeholder="Descreva brevemente o motivo do contato, se desejar..."
                error={contactErrors.message?.message}
                {...registerContact('message')}
                disabled={appointmentMutation.isLoading}
              />
              <div className="mt-6 flex justify-end space-x-2">
                <Button type="button" variant="ghost" onClick={() => { setContactModalOpen(false); resetContactForm(); }} disabled={appointmentMutation.isLoading}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" loading={appointmentMutation.isLoading} disabled={appointmentMutation.isLoading}>
                  {appointmentMutation.isLoading ? 'Enviando...' : 'Enviar Solicitação'}
                </Button>
              </div>
            </form>
          </Modal>
        </Card>
      )}

      <Modal isOpen={showConsentModal} onClose={() => setShowConsentModal(false)} title="Consentimento para Salvar Dados">
        <div className="text-sm">
          <p className="mb-4">Ao salvar, você permite que associemos estes resultados à sua conta (se logado) para que você possa ver seu histórico. Como seus dados são usados:</p>
          <ul className="list-disc list-inside mb-4 space-y-1 text-neutral-DEFAULT">
            <li>Acompanhamento do seu progresso pessoal ao longo do tempo.</li>
            <li>Contextualização (anônima) para melhorar as respostas do assistente de IA.</li>
            <li>Análise agregada e anonimizada para melhorar nossos serviços.</li>
            <li>Dados podem ser anonimizados ou excluídos conforme nossa política de retenção.</li>
          </ul>
          <p className="mb-4">Leia nossa <Link to="/privacidade" className="text-primary underline" target="_blank" rel="noopener noreferrer">Política de Privacidade</Link> para mais detalhes.</p>
          <p className="font-semibold">Você consente em salvar os resultados desta avaliação?</p>
        </div>
        <div className="mt-6 flex justify-end space-x-3">
          <Button variant="outline" onClick={() => setShowConsentModal(false)} disabled={saveMutation.isLoading}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleConsentAndSave} loading={saveMutation.isLoading} disabled={saveMutation.isLoading}>
            Sim, Eu Consinto
          </Button>
        </div>
      </Modal>

    </div>
  );
};

// Simple Tooltip Component (definido aqui ou importado de ui.jsx)
const Tooltip = ({ children, text }) => (
  <div className="relative inline-block group">
    {children}
    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 text-xs font-medium text-white bg-gray-800 rounded-md shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap z-10 pointer-events-none">
      {text}
       <div className="absolute left-1/2 transform -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-800"></div>
    </div>
  </div>
);


// --- Chat Page (sem alterações) ---
// ... (código existente da ChatPage) ...
const ChatPage = () => {
  const [messages, setMessages] = useState([]); // { role: 'user' | 'assistant', content: string }[]
  const [input, setInput] = useState('');
  const { user, isAuthenticated } = useAuthStore(); // <<< Get user and auth status
  const [sessionId, setSessionId] = useState(null); // Store session ID for context
  const messagesEndRef = useRef(null);

  const chatMutation = useMutation({
    // Send userId only if authenticated
    mutationFn: (newMessageData) => apiClient.post('/chat', newMessageData),
    onSuccess: (response) => {
      setMessages(prev => [...prev, { role: 'assistant', content: response.data.reply }]);
      // Ensure session ID is stored from the first response
      if (!sessionId && response.data.sessionId) {
         setSessionId(response.data.sessionId);
      }
    },
    onError: (error) => {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: error.response?.data?.message || "Desculpe, ocorreu um erro inesperado ao processar sua mensagem." }]);
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

   // Reset chat when user logs in/out or component mounts
   useEffect(() => {
       setMessages([]);
       setSessionId(null); // Reset session on user change or mount
   }, [isAuthenticated, user]); // Depend on auth state

  const handleSend = (e) => {
    e.preventDefault();
    if (input.trim() && !chatMutation.isLoading) {
      const userMessage = { role: 'user', content: input };
      setMessages(prev => [...prev, userMessage]);

      // Prepare data for mutation
      const messageData = {
          message: input,
          sessionId: sessionId // Include session ID if it exists
      };
      // Include userId only if authenticated
      if (isAuthenticated && user?.id) {
          messageData.userId = user.id;
      }

      chatMutation.mutate(messageData);
      setInput('');
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] max-w-3xl mx-auto bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
      <div className="p-4 border-b bg-primary-light text-primary-dark font-semibold">
        <FontAwesomeIcon icon={faComments} className="mr-2" /> Chat com Assistente MindGuide
      </div>
      <div className="flex-grow p-4 overflow-y-auto space-y-4 bg-gray-50">
        {/* Initial message from bot */}
        {messages.length === 0 && (
          <div className="flex items-start space-x-3">
            <FontAwesomeIcon icon={faRobot} className="text-primary text-xl mt-1 flex-shrink-0" />
            <div className="bg-gray-100 p-3 rounded-lg sm:shadow-sm border border-gray-200">
              <p className="text-sm text-neutral-dark">Olá! Eu sou o MindGuide. Como posso te ajudar hoje? Você pode perguntar sobre bem-estar, ansiedade, humor ou como funcionam as autoavaliações.</p>
                 {/* Show context awareness hint if logged in */}
                 {isAuthenticated && (
                    <p className="text-xs text-neutral-DEFAULT mt-2 italic">Se você fez uma autoavaliação recentemente, posso levar isso em conta.</p>
                )}
            </div>
          </div>
        )}
        {/* Chat messages */}
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex items-start space-x-3 ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
              <FontAwesomeIcon icon={msg.role === 'user' ? faUser : faRobot} className={`text-xl mt-1 flex-shrink-0 ${msg.role === 'user' ? 'text-secondary-dark' : 'text-primary'}`} />
              <div className={`${msg.role === 'user' ? 'bg-primary text-white' : 'bg-gray-100 text-neutral-dark border border-gray-200'} p-3 rounded-lg sm:shadow-sm`}>
                {/* Basic Markdown support (line breaks) */}
                 {msg.content.split('\n').map((line, i) => (
                   <p key={i} className="text-sm">{line || '\u00A0'}</p> // Use non-breaking space for empty lines
                 ))}
              </div>
            </div>
          </div>
        ))}
        {chatMutation.isLoading && (
          <div className="flex items-start space-x-3">
            <FontAwesomeIcon icon={faRobot} className="text-primary text-xl mt-1 flex-shrink-0" />
            <div className="bg-gray-100 p-3 rounded-lg inline-flex items-center border border-gray-200 shadow-sm">
              <Spinner size="sm" color="primary" className="mr-2" /> {/* Changed color */}
              <span className="text-sm italic text-neutral-DEFAULT">MindGuide está digitando...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} /> {/* Anchor for scrolling */}
      </div>
      <form onSubmit={handleSend} className="p-4 border-t flex items-center space-x-2 bg-white"> {/* Changed bg */}
        <Input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Digite sua mensagem..."
          className="flex-grow !mb-0" // Removed extra padding, let Input component handle it
          disabled={chatMutation.isLoading}
          aria-label="Entrada do chat"
        />
        <Button
          type="submit"
          variant="primary"
          disabled={chatMutation.isLoading || !input.trim()}
          aria-label="Enviar mensagem" // Accessibility
        >
          <FontAwesomeIcon icon={faPaperPlane} />
        </Button>
      </form>
    </div>
  );
};


// --- Resources Page and Resource Pages ---
// (sem alterações na lógica, apenas render)
// ... (código existente para ResourcesPage) ...
const resourceDataStatic = [
    { id: 1, type: 'Artigo', title: 'Entendendo a Ansiedade', description: 'Aprenda sobre os sintomas comuns e tipos de transtornos de ansiedade.', pagePath: '/recursos/artigo/entendendo-ansiedade' },
    { id: 2, type: 'Artigo', title: 'Estratégias para Lidar com o Baixo Humor', description: 'Dicas práticas para ajudar a gerenciar sentimentos de depressão ou tristeza.', pagePath: '/recursos/artigo/estrategias-baixo-humor' },
    { id: 3, type: 'Guia', title: 'Guia de Meditação Mindfulness', description: 'Um guia passo a passo para iniciar uma prática de mindfulness, com link para PDF.', pagePath: '/recursos/guia/meditacao-mindfulness', link: '/resources/mindfulness-guide.pdf' },
    { id: 4, type: 'Áudio', title: 'Exercício de Respiração de 5 Minutos', description: 'Um áudio guiado curto para relaxamento rápido.', pagePath: '/recursos/audio/exercicio-respiracao' },
    { id: 5, type: 'Artigo', title: 'A Importância do Sono para a Saúde Mental', description: 'Explore a conexão entre a qualidade do sono e o bem-estar emocional.', pagePath: '/recursos/artigo/importancia-sono' },
    { id: 6, type: 'Link Externo', title: 'CVV (Centro de Valorização da Vida)', description: 'Ligue 188. Serviço de apoio emocional e prevenção do suicídio (Brasil).', link: 'https://www.cvv.org.br/', external: true },
  ];

const fuseOptions = {
  keys: ['title', 'description', 'type'],
  threshold: 0.4,
};

const ResourcesPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const fuse = new Fuse(resourceDataStatic, fuseOptions);
  const [filteredResources, setFilteredResources] = useState(resourceDataStatic);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredResources(resourceDataStatic);
    } else {
      const results = fuse.search(searchTerm);
      setFilteredResources(results.map(result => result.item));
    }
  }, [searchTerm]);

  const openResource = (resource) => {
    if (resource.pagePath) {
      navigate(resource.pagePath);
    } else if (resource.external) {
      window.open(resource.link, '_blank', 'noopener,noreferrer');
    } else if (resource.link) {
      window.open(resource.link, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div>
      <h2 className="text-3xl font-bold mb-6 text-primary">Biblioteca de Recursos</h2>
      <p className="mb-8 text-neutral-DEFAULT">Explore artigos, guias e ferramentas para apoiar seu bem-estar mental. Use a barra de busca para encontrar tópicos específicos.</p>

      <div className="mb-8 relative">
          <Input
            type="search"
            placeholder="Buscar recursos (ex: ansiedade, sono, meditação)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            aria-label="Buscar recursos"
          />
          <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

      {filteredResources.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResources.map(resource => (
            <Card key={resource.id} className="flex flex-col justify-between hover:shadow-lg transition-shadow duration-200 ease-in-out">
              <div>
                <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full mb-2 ${
                  resource.type === 'Artigo' ? 'bg-blue-100 text-blue-800' :
                  resource.type === 'Guia' ? 'bg-green-100 text-green-800' :
                  resource.type === 'Áudio' ? 'bg-purple-100 text-purple-800' :
                  'bg-gray-100 text-gray-800'
                }`}>{resource.type}</span>
                <h3 className="text-lg font-semibold mb-2">{resource.title}</h3>
                <p className="text-sm text-neutral-DEFAULT mb-4">{resource.description}</p>
              </div>
              <Button onClick={() => openResource(resource)} variant="outline" size="sm" className="mt-auto self-start">
                {resource.type === 'Artigo' ? 'Ler Artigo' :
                 resource.type === 'Guia' ? 'Ver Guia' :
                 resource.type === 'Áudio' ? 'Ouvir Áudio' :
                 resource.external ? 'Visitar Link' :
                 resource.link ? 'Abrir PDF' :
                 'Ver Recurso'} <FontAwesomeIcon icon={faArrowRight} className="ml-1" />
              </Button>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-center text-neutral-DEFAULT italic">Nenhum recurso encontrado para "{searchTerm}".</p>
      )}
    </div>
  );
};

// Recurso Layout (Importado de ui.jsx ou definido aqui)
// A definição do RecursoLayout foi movida para ui.jsx
// Se não foi, copie a definição dela aqui.

const ArtigoEntendendoAnsiedadePage = () => (
    <RecursoLayout title="Entendendo a Ansiedade">
       <p className="lead">A ansiedade é uma emoção humana normal e geralmente saudável. No entanto, quando uma pessoa sente regularmente níveis desproporcionais de ansiedade, pode tornar-se uma condição médica.</p>

      <h2 className="mt-8 mb-4 text-2xl font-semibold text-neutral-dark">O que é Ansiedade?</h2>
      <p>A ansiedade é a resposta natural do corpo ao estresse. É um sentimento de medo ou apreensão sobre o que está por vir. O primeiro dia de escola, ir a uma entrevista de emprego ou fazer um discurso podem causar sentimentos de medo e nervosismo na maioria das pessoas.</p>
      <p>Mas se seus sentimentos de ansiedade são extremos, duram mais de six meses e estão interferindo na sua vida, você pode ter um transtorno de ansiedade.</p>
      <img
          src={anxietyComparisonDiagram}
          alt="Diagrama comparando ansiedade normal versus transtorno de ansiedade"
          className="my-6 rounded-lg shadow-sm mx-auto w-[40rem] h-auto object-contain" // Largura e centralização aplicadas
          loading="lazy"
      />

      <h2 className="mt-8 mb-4 text-2xl font-semibold text-neutral-dark">Sintomas Comuns de Transtornos de Ansiedade</h2>
      <p>Os transtornos de ansiedade podem se manifestar de várias maneiras. Os sintomas comuns incluem:</p>
      <ul className="space-y-1 list-disc list-outside ml-5 marker:text-primary">
         <li>Sentimentos de nervosismo, inquietação ou tensão</li>
         <li>Sensação de perigo iminente, pânico ou desgraça</li>
         <li>Aumento da frequência cardíaca</li>
         <li>Respiração rápida (hiperventilação)</li>
         <li>Sudorese</li>
         <li>Tremores</li>
         <li>Sensação de fraqueza ou cansaço</li>
         <li>Dificuldade de concentração ou pensamento sobre outra coisa que não a preocupação atual</li>
         <li>Problemas para dormir</li>
         <li>Experimentar problemas gastrointestinais (GI)</li>
         <li>Ter dificuldade em controlar a preocupação</li>
         <li>Ter o desejo de evitar coisas que desencadeiam ansiedade</li>
      </ul>
       <img
           src={anxietySymptomsIllustration}
           alt="Ilustração de uma pessoa com sintomas físicos de ansiedade como coração acelerado e sudorese"
           className="my-6 rounded-lg shadow-sm mx-auto w-[40rem] h-auto object-contain" // Estilo aplicado, max-w opcional
           loading="lazy"
       />

      <h2 className="mt-8 mb-4 text-2xl font-semibold text-neutral-dark">Tipos de Transtornos de Ansiedade</h2>
      <p>Existem vários tipos de transtornos de ansiedade, incluindo:</p>
      <ul className="space-y-1 list-disc list-outside ml-5 marker:text-primary">
         <li><strong>Transtorno de Ansiedade Generalizada (TAG):</strong> Preocupação excessiva com atividades ou eventos cotidianos.</li>
         <li><strong>Transtorno do Pânico:</strong> Episódios repetidos de sentimentos súbitos de ansiedade intensa e medo ou terror que atingem um pico em minutos (ataques de pânico).</li>
         <li><strong>Fobias Específicas:</strong> Ansiedade significativa quando exposto a um objeto ou situação específica e um desejo de evitá-lo.</li>
         <li><strong>Transtorno de Ansiedade Social (Fobia Social):</strong> Níveis elevados de ansiedade, medo e evitação de situações sociais devido a sentimentos de constrangimento, autoconsciência e preocupação em ser julgado ou visto negativamente por outros.</li>
      </ul>
       <img
           src={anxietyTypesIcons}
           alt="Ícones representando Transtorno de Ansiedade Generalizada, Pânico, Fobia e Ansiedade Social"
           className="my-6 rounded-lg shadow-sm mx-auto w-[40rem] h-auto object-contain" // Estilo aplicado
           loading="lazy"
       />

      <h2 className="mt-8 mb-4 text-2xl font-semibold text-neutral-dark">Quando Procurar Ajuda</h2>
      <p>Se a ansiedade está interferindo no seu trabalho, relacionamentos ou outras partes da sua vida, ou se você está tendo dificuldade em controlar suas preocupações, considere falar com um profissional de saúde mental. Tratamentos como terapia e medicação podem ajudar significativamente.</p>
      <p>Você pode usar nossa <Link to="/autoavaliacao">ferramenta de autoavaliação</Link> ou <Link to="/chat">conversar com nosso assistente</Link> para obter mais informações e apoio inicial.</p>
    </RecursoLayout>
);

const ArtigoEstrategiasBaixoHumorPage = () => (
    <RecursoLayout title="Estratégias para Lidar com o Baixo Humor">
       <p className="lead">Sentir-se para baixo ou triste ocasionalmente é uma parte normal da vida. No entanto, se esses sentimentos persistirem e começarem a afetar seu dia a dia, é importante procurar maneiras de lidar e buscar apoio.</p>

      <h2 className="mt-8 mb-4 text-2xl font-semibold text-neutral-dark">Reconhecendo o Baixo Humor vs. Depressão</h2>
      <p>O baixo humor geralmente é temporário e ligado a eventos específicos ou estresse. A depressão é uma condição de saúde mental mais persistente e grave, caracterizada por tristeza profunda, perda de interesse e outros sintomas que afetam significativamente a vida diária.</p>
      <img
          src={lowMoodVsDepressionChart}
          alt="Gráfico comparando características de baixo humor passageiro e depressão clínica"
          className="my-6 rounded-lg shadow-sm mx-auto w-[40rem] h-auto object-contain" // Estilo aplicado
          loading="lazy"
      />

      <h2 className="mt-8 mb-4 text-2xl font-semibold text-neutral-dark">Estratégias Práticas de Autocuidado</h2>
      <p>Pequenos passos podem fazer uma grande diferença quando você está se sentindo para baixo:</p>
      <ul className="space-y-3 list-disc list-outside ml-5 marker:text-primary">
        <li>
          <strong>Mova seu corpo:</strong> A atividade física libera endorfinas, que podem melhorar o humor. Mesmo uma curta caminhada pode ajudar.
          <img
              src={outdoorWalkPerson}
              alt="Pessoa caminhando ao ar livre em um parque"
              className="my-4 rounded-lg shadow-sm mx-auto w-[40rem] h-auto object-cover" // Estilo aplicado, object-cover pode ser útil
              loading="lazy"
          />
        </li>
        <li><strong>Conecte-se com outros:</strong> Falar com amigos, familiares ou um grupo de apoio pode reduzir sentimentos de isolamento.</li>
        <li><strong>Pratique a Atenção Plena (Mindfulness):</strong> Técnicas como meditação ou respiração profunda podem ajudar a acalmar a mente e focar no presente. Veja nosso <Link to="/recursos/guia/meditacao-mindfulness">guia de mindfulness</Link>.</li>
        <li><strong>Estabeleça pequenas metas alcançáveis:</strong> Concluir tarefas, por menores que sejam, pode proporcionar uma sensação de realização.</li>
        <li><strong>Mantenha uma rotina:</strong> Ter horários regulares para dormir, comer e realizar atividades pode trazer estrutura e estabilidade.</li>
        <li>
          <strong>Alimente-se bem:</strong> Uma dieta equilibrada pode impactar positivamente o humor e os níveis de energia.
          <img
              src={healthyFoodPhoto}
              alt="Prato colorido com frutas, vegetais e alimentos nutritivos"
              className="my-4 rounded-lg shadow-sm mx-auto w-[40rem] h-auto object-cover" // Estilo aplicado
              loading="lazy"
          />
        </li>
        <li><strong>Limite o consumo de álcool e substâncias:</strong> Estes podem piorar os sintomas de baixo humor ou depressão.</li>
        <li><strong>Seja gentil consigo mesmo:</strong> Reconheça seus sentimentos sem julgamento e permita-se ter dias bons e ruins.</li>
      </ul>

      <h2 className="mt-8 mb-4 text-2xl font-semibold text-neutral-dark">Quando o Autocuidado Não é Suficiente</h2>
      <p>Se o baixo humor persistir por mais de duas semanas, se intensificar ou se você começar a ter pensamentos de automutilação, é crucial procurar ajuda profissional.</p>
      <p>Considere:</p>
      <ul className="space-y-1 list-disc list-outside ml-5 marker:text-primary">
         <li>Realizar nossa <Link to="/autoavaliacao">autoavaliação</Link> para entender melhor seus sintomas.</li>
         <li>Conversar com um médico ou profissional de saúde mental.</li>
         <li>Utilizar a opção "Buscar Ajuda Profissional" após a avaliação ou diretamente na página de recursos.</li>
      </ul>
      <p>Lembre-se, buscar ajuda é um sinal de força.</p>
      <img
          src={supportTherapyIllustration}
          alt="Ilustração de duas mãos se apoiando, simbolizando ajuda e terapia"
          className="my-6 rounded-lg shadow-sm mx-auto w-[40rem] h-auto object-contain" // Estilo aplicado
          loading="lazy"
      />
    </RecursoLayout>
);

const GuiaMindfulnessPage = () => (
    <RecursoLayout title="Guia de Meditação Mindfulness">
       <p className="lead">Mindfulness, ou atenção plena, é a prática de prestar atenção intencionalmente ao momento presente, sem julgamento. A meditação mindfulness é uma forma de treinar essa habilidade.</p>

      <h2 className="mt-8 mb-4 text-2xl font-semibold text-neutral-dark">Benefícios da Mindfulness</h2>
      <p>A prática regular de mindfulness pode ajudar a:</p>
      <ul className="space-y-1 list-disc list-outside ml-5 marker:text-primary">
         <li>Reduzir o estresse e a ansiedade</li>
         <li>Melhorar o foco e a concentração</li>
         <li>Aumentar a autoconsciência</li>
         <li>Promover o bem-estar emocional</li>
         <li>Melhorar a qualidade do sono</li>
      </ul>
      <img
          src={mindfulnessBenefitsIcons}
          alt="Ícones representando benefícios da mindfulness: cérebro calmo, coração, foco, sono"
          className="my-6 rounded-lg shadow-sm mx-auto w-[40rem] h-auto object-contain" // Estilo aplicado
          loading="lazy"
      />

      <h2 className="mt-8 mb-4 text-2xl font-semibold text-neutral-dark">Como Começar: Um Guia Simples</h2>
      <ol className="space-y-3 list-decimal list-outside ml-5">
        <li><strong>Encontre um lugar tranquilo:</strong> Escolha um local onde você não seja interrompido por alguns minutos.</li>
        <li>
            <strong>Sente-se confortavelmente:</strong> Você pode sentar em uma cadeira com os pés no chão, ou no chão com as pernas cruzadas. Mantenha a coluna ereta, mas relaxada.
            <img
                src={meditationPostureIllustration}
                alt="Ilustração de pessoa meditando sentada em cadeira e no chão"
                className="my-4 rounded-lg shadow-sm mx-auto w-[40rem] h-auto object-contain" // Estilo aplicado
                loading="lazy"
            />
        </li>
        <li><strong>Feche os olhos ou suavize o olhar:</strong> Se preferir manter os olhos abertos, fixe o olhar suavemente em um ponto à sua frente.</li>
        <li><strong>Preste atenção à sua respiração:</strong> Observe a sensação do ar entrando e saindo do seu corpo. Sinta o abdômen ou o peito subindo e descendo. Não tente controlar a respiração, apenas observe.</li>
        <li><strong>Note quando sua mente divagar:</strong> É normal que pensamentos, emoções ou sensações surjam. Quando perceber que sua mente divagou, reconheça gentilmente para onde ela foi (ex: "pensando") e, sem julgamento, traga sua atenção de volta para a respiração.</li>
        <li><strong>Comece com pouco tempo:</strong> Tente meditar por 5 minutos no início e aumente gradualmente o tempo conforme se sentir confortável.</li>
      </ol>

      <h2 className="mt-8 mb-4 text-2xl font-semibold text-neutral-dark">Recursos Adicionais</h2>
      <p>Para um guia mais detalhado e para impressão, você pode baixar nosso guia completo em PDF.</p>
      <img
          src={mindfulnessGuidePdfCover}
          alt="Capa ou miniatura do Guia de Meditação Mindfulness em PDF"
          className="my-6 rounded-lg shadow-sm mx-auto w-[40rem] h-auto object-contain" // Estilo aplicado
          loading="lazy"
      />
      <div className="mt-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <a href="/resources/mindfulness-guide.pdf" target="_blank" rel="noopener noreferrer" download="Guia-Mindfulness-MindWell.pdf" className="inline-block">
          <Button variant="primary">
            <FontAwesomeIcon icon={faDownload} className="mr-2" />
            Baixar Guia Completo (PDF)
          </Button>
        </a>
        <Button variant="outline" size="sm" onClick={() => navigate('/recursos/audio/exercicio-respiracao')}>
          <FontAwesomeIcon icon={faHeartPulse} className="mr-2" /> Ouvir Exercício de Respiração
        </Button>
      </div>
    </RecursoLayout>
);

const ArtigoImportanciaSonoPage = () => (
    <RecursoLayout title="A Importância do Sono para a Saúde Mental">
       <p className="lead">O sono não é apenas um período de descanso; é um processo ativo e crucial para a saúde física e mental. A falta de sono de qualidade pode ter um impacto significativo no nosso humor, cognição e bem-estar geral.</p>

      <h2 className="mt-8 mb-4 text-2xl font-semibold text-neutral-dark">A Conexão Cérebro-Sono</h2>
      <p>Durante o sono, o cérebro passa por processos vitais:</p>
      <ul className="space-y-1 list-disc list-outside ml-5 marker:text-primary">
         <li><strong>Consolidação da Memória:</strong> O sono ajuda a transformar memórias de curto prazo em memórias de longo prazo.</li>
         <li><strong>Processamento Emocional:</strong> O cérebro processa as emoções do dia, ajudando a regular o humor. A privação do sono pode levar a reações emocionais exageradas.</li>
         <li><strong>Reparo e Limpeza:</strong> O sistema glinfático do cérebro fica mais ativo durante o sono, removendo toxinas que se acumulam durante a vigília.</li>
      </ul>
      <img
          src={brainSleepActivityIllustration}
          alt="Ilustração de um cérebro com atividade durante o sono (limpeza, consolidação)"
          className="my-6 rounded-lg shadow-sm mx-auto w-[40rem] h-auto object-contain" // Estilo aplicado
          loading="lazy"
      />

      <h2 className="mt-8 mb-4 text-2xl font-semibold text-neutral-dark">Impacto da Privação do Sono na Saúde Mental</h2>
      <p>A falta crônica de sono está associada a um risco aumentado ou agravamento de várias condições de saúde mental, incluindo:</p>
      <ul className="space-y-1 list-disc list-outside ml-5 marker:text-primary">
         <li>Depressão</li>
         <li>Transtornos de Ansiedade</li>
         <li>Transtorno Bipolar</li>
         <li>Transtorno de Déficit de Atenção e Hiperatividade (TDAH)</li>
      </ul>
      <p>A relação é muitas vezes bidirecional: problemas de saúde mental podem causar insônia, e a insônia pode piorar os problemas de saúde mental.</p>
      <img
          src={sleepMentalHealthCycleDiagram}
          alt="Diagrama mostrando o ciclo entre problemas de sono e saúde mental"
          className="my-6 rounded-lg shadow-sm mx-auto w-[40rem] h-auto object-contain" // Estilo aplicado
          loading="lazy"
      />

      <h2 className="mt-8 mb-4 text-2xl font-semibold text-neutral-dark">Dicas para Melhorar a Higiene do Sono</h2>
      <p>Adotar bons hábitos de sono (higiene do sono) pode melhorar a qualidade do seu descanso:</p>
      <ul className="space-y-3 list-disc list-outside ml-5 marker:text-primary">
        <li><strong>Mantenha um horário regular:</strong> Tente ir para a cama e acordar por volta do mesmo horário todos os dias, mesmo nos fins de semana.</li>
        <li><strong>Crie um ambiente propício ao sono:</strong> Seu quarto deve ser escuro, silencioso e fresco.</li>
        <li>
          <strong>Desenvolva uma rotina relaxante antes de dormir:</strong> Leia um livro, tome um banho morno ou ouça música calma. Evite telas (celular, TV, computador) pelo menos uma hora antes de deitar.
          <img
              src={bedtimeRoutineIcons}
              alt="Ícones de rotina antes de dormir: livro, banho, lua"
              className="my-4 rounded-lg shadow-sm mx-auto w-[40rem]  h-auto object-contain" // Estilo aplicado
              loading="lazy"
          />
        </li>
        <li><strong>Evite cafeína e álcool perto da hora de dormir:</strong> Essas substâncias podem atrapalhar o sono.</li>
        <li><strong>Limite cochilos durante o dia:</strong> Se precisar cochilar, faça-o por no máximo 20-30 minutos e evite cochilar no final da tarde.</li>
        <li><strong>Exercite-se regularmente, mas não muito perto da hora de dormir.</strong></li>
        <li><strong>Exponha-se à luz natural durante o dia:</strong> Isso ajuda a regular o relógio biológico.</li>
      </ul>

      <h2 className="mt-8 mb-4 text-2xl font-semibold text-neutral-dark">Quando Procurar Ajuda</h2>
      <p>Se você está lutando consistentemente contra a insônia ou suspeita que um problema de sono está afetando sua saúde mental, converse com seu médico. Eles podem ajudar a identificar a causa e recomendar tratamentos apropriados, que podem incluir terapia (como TCC-I) ou, em alguns casos, medicação.</p>
    </RecursoLayout>
);

// --- Professional Dashboard Page (sem alterações) ---
// ... (código existente da ProDashboardPage) ...
const ProDashboardPage = () => {
  const { data: stats, isLoading: isLoadingStats, error: errorStats } = useQuery({
    queryKey: ['proStats'], // Could rename for clarity if needed
    queryFn: () => apiClient.get('/stats').then(res => res.data),
  });

  // Fetch recent assessments (Admin/Pro endpoint)
  const { data: assessments, isLoading: isLoadingAssessments, error: errorAssessments } = useQuery({
    queryKey: ['recentAssessments'], // Key for pro/admin view
    // Using the existing /assessments endpoint with sorting/limiting for pro view
    queryFn: () => apiClient.get('/assessments?limit=10&sortBy=createdAt&sortOrder=DESC').then(res => res.data.assessments), // Extract assessments array
  });

   // Fetch pending appointments (using the correct endpoint)
  const { data: appointments, isLoading: isLoadingAppointments, error: errorAppointments } = useQuery({
    queryKey: ['pendingAppointments'], // More specific key
    queryFn: () => apiClient.get('/appointments?status=pending').then(res => res.data.appointments), // Extract appointments array
  });

  // Example mutation to update appointment status
  const queryClient = useQueryClient();
  const updateAppointmentMutation = useMutation({
    mutationFn: ({ id, status }) => apiClient.put(`/appointments/${id}`, { status }),
    onSuccess: (_, variables) => { // Access variables passed to mutate
      console.log(`Appointment ${variables.id} status updated to ${variables.status}`);
      queryClient.invalidateQueries({ queryKey: ['pendingAppointments'] });
      queryClient.invalidateQueries({ queryKey: ['proStats'] }); // Stats might include pending count
    },
    onError: (error, variables) => {
      console.error(`Failed to update appointment ${variables.id}:`, error);
      alert(`Failed to update appointment: ${error.response?.data?.message || error.message}`);
    }
  });

  const handleConfirmAppointment = (id) => {
    updateAppointmentMutation.mutate({ id, status: 'confirmed' });
  };
  const handleCancelAppointment = (id) => {
    // Optional: Add confirmation dialog
    if (window.confirm(`Tem certeza que deseja cancelar/rejeitar a solicitação ${id}?`)) {
        updateAppointmentMutation.mutate({ id, status: 'cancelled' });
    }
  };

  const isLoading = isLoadingStats || isLoadingAssessments || isLoadingAppointments;
  const errors = [errorStats, errorAssessments, errorAppointments].filter(Boolean);

  // Combine data safely
  const displayStats = stats || { highRiskToday: 0, totalAssessmentsMonth: 0, newContactsPending: appointments?.length || 0 };
  const recentAssessments = assessments || [];
  const pendingAppointments = appointments || [];

  return (
    <div>
      <h2 className="text-3xl font-bold mb-8 text-primary"><FontAwesomeIcon icon={faChartLine} className="mr-2" />Painel Profissional</h2>

       {isLoading && <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>}
       {errors.length > 0 && (
            <div className="mb-6 space-y-2">
                {errors.map((err, index) => (
                    <Alert key={index} type="error" title="Erro ao Carregar Dados" message={err.message || 'Falha ao buscar informações.'} />
                ))}
            </div>
        )}

      {/* KPI Cards */}
       {!isLoading && (
        <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <Card className={errorStats ? 'border-l-4 border-danger' : ''}>
                <h3 className="text-lg font-semibold text-neutral-DEFAULT mb-2">Alto Risco Hoje</h3>
                {errorStats ? <p className="text-danger text-sm italic">Erro</p> : <p className="text-4xl font-bold text-danger">{displayStats.highRiskToday ?? 'N/D'}</p>}
                </Card>
                <Card className={errorStats ? 'border-l-4 border-danger' : ''}>
                <h3 className="text-lg font-semibold text-neutral-DEFAULT mb-2">Avaliações (Este Mês)</h3>
                {errorStats ? <p className="text-danger text-sm italic">Erro</p> : <p className="text-4xl font-bold text-primary">{displayStats.totalAssessmentsMonth ?? 'N/D'}</p>}
                </Card>
                <Card className={errorAppointments ? 'border-l-4 border-danger' : ''}>
                <h3 className="text-lg font-semibold text-neutral-DEFAULT mb-2">Solicitações Pendentes</h3>
                {errorAppointments ? <p className="text-danger text-sm italic">Erro</p> : <p className="text-4xl font-bold text-secondary-dark">{displayStats.newContactsPending ?? 'N/D'}</p>}
                </Card>
            </div>

            {/* Recent High-Risk Assessments Table */}
            <section className="mb-10">
                <h3 className="text-2xl font-semibold mb-4 text-neutral-dark">Avaliações Recentes</h3>
                {errorAssessments && <Alert type="error" message="Erro ao carregar avaliações recentes." />}
                {!errorAssessments && recentAssessments.length === 0 && <p className="text-neutral-DEFAULT italic">Nenhuma avaliação recente encontrada.</p>}
                {!errorAssessments && recentAssessments.length > 0 && (
                <Card className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nível Risco</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PHQ-9</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">GAD-7</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Risco Suicida?</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuário</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {/* Sort client-side if needed, or rely on backend sorting */}
                        {recentAssessments.map((assessment) => (
                         <tr key={assessment.id} className={`${assessment.riskLevel === 'HIGH' ? 'bg-red-50' : assessment.riskLevel === 'MODERATE' ? 'bg-yellow-50' : ''}`}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(assessment.createdAt).toLocaleDateString('pt-BR')}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                             <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${assessment.riskLevel === 'HIGH' ? 'bg-red-100 text-red-800' :
                                assessment.riskLevel === 'MODERATE' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                                }`}>{assessment.riskLevel === 'HIGH' ? 'ALTO' : assessment.riskLevel === 'MODERATE' ? 'MODERADO' : 'BAIXO'}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{assessment.phqScore}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{assessment.gadScore}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                             {assessment.isSuicidalRisk ? <span className="text-red-600">Sim</span> : 'Não'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                             {assessment.User ? assessment.User.email : 'Anônimo'}
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
                <h3 className="text-2xl font-semibold mb-4 text-neutral-dark"><FontAwesomeIcon icon={faCalendarAlt} className="mr-2" />Solicitações de Contato Pendentes</h3>
                {errorAppointments && <Alert type="error" message="Erro ao carregar solicitações pendentes." />}
                {!errorAppointments && pendingAppointments.length === 0 && <p className="text-neutral-DEFAULT italic">Nenhuma solicitação pendente.</p>}
                {!errorAppointments && pendingAppointments.length > 0 && (
                <div className="space-y-4">
                    {pendingAppointments.map(appt => (
                    <Card key={appt.id}>
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                        <div className="flex-grow">
                            <p className="text-sm text-gray-500">Recebido: {new Date(appt.createdAt).toLocaleString('pt-BR')}</p>
                            <p className="font-semibold mt-1">De: {appt.patientName} ({appt.patientContact || 'Contato não disponível'})</p>
                            <p className="mt-2 text-sm text-gray-700 bg-gray-50 p-2 border rounded">{appt.message || 'Nenhuma mensagem fornecida.'}</p>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 flex-shrink-0 self-end sm:self-center">
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleConfirmAppointment(appt.id)}
                                loading={updateAppointmentMutation.isLoading && updateAppointmentMutation.variables?.id === appt.id && updateAppointmentMutation.variables?.status === 'confirmed'}
                                disabled={updateAppointmentMutation.isLoading}
                            >
                            Confirmar
                            </Button>
                            <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleCancelAppointment(appt.id)}
                                loading={updateAppointmentMutation.isLoading && updateAppointmentMutation.variables?.id === appt.id && updateAppointmentMutation.variables?.status === 'cancelled'}
                                disabled={updateAppointmentMutation.isLoading}
                            >
                            Cancelar
                            </Button>
                        </div>
                        </div>
                    </Card>
                    ))}
                </div>
                )}
            </section>
        </>
       )}
    </div>
  );
};

// --- Admin Panel Page (sem alterações) ---
// ... (código existente da AdminPanelPage) ...
const AdminPanelPage = () => {
  const queryClient = useQueryClient();

  // Fetch Users (using /admin/users)
  const { data: users, isLoading: isLoadingUsers, error: errorUsers, refetch: refetchUsers } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: () => apiClient.get('/admin/users').then(res => res.data)
  });

  // Fetch Logs (using /admin/logs)
  const { data: logs, isLoading: isLoadingLogs, error: errorLogs } = useQuery({
    queryKey: ['adminLogs'],
    queryFn: () => apiClient.get('/admin/logs?limit=100').then(res => res.data.logs), // Extract logs array
    refetchInterval: 30000
  });

  // --- Mutations ---
  const updateUserMutation = useMutation({
    mutationFn: ({ id, role }) => apiClient.put(`/admin/users/${id}`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      alert('Função do usuário atualizada.');
    },
    onError: (error) => alert(`Erro ao atualizar usuário: ${error.response?.data?.message || error.message}`)
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id) => apiClient.delete(`/admin/users/${id}`),
    onSuccess: (_, deletedUserId) => { // Access the variable passed to mutate
        queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
        alert(`Usuário ${deletedUserId} excluído.`);
    },
    onError: (error, deletedUserId) => alert(`Erro ao excluir usuário ${deletedUserId}: ${error.response?.data?.message || error.message}`)
  });

  const triggerBackupMutation = useMutation({
    mutationFn: () => apiClient.post('/admin/backup'),
    onSuccess: (data) => alert(`Backup iniciado com sucesso: ${data.data?.message || 'OK'}`),
    onError: (error) => alert(`Erro ao iniciar backup: ${error.response?.data?.message || error.message}`)
  });

  const triggerAnonymizeMutation = useMutation({
    mutationFn: () => apiClient.post('/admin/anonymize'),
    onSuccess: (data) => alert(`Tarefa de anonimização iniciada: ${data.data?.message || 'OK'}`),
    onError: (error) => alert(`Erro ao iniciar anonimização: ${error.response?.data?.message || error.message}`)
  });

  // --- Handlers ---
  const handleRoleChange = (userId, userEmail, currentRole, newRole) => {
     if (currentRole === newRole) return; // No change
    if (confirm(`Alterar a função do usuário ${userEmail} (ID: ${userId}) de '${currentRole}' para '${newRole}'?`)) {
      updateUserMutation.mutate({ id: userId, role: newRole });
    }
  };

  const handleDeleteUser = (userId, userEmail) => {
    if (confirm(`Tem certeza de que deseja excluir o usuário ${userEmail} (ID: ${userId})? Esta ação NÃO PODE SER DESFEITA.`)) {
      deleteUserMutation.mutate(userId);
    }
  };

  const handleTriggerBackup = () => {
    if (confirm('Iniciar um backup do banco de dados agora?')) {
      triggerBackupMutation.mutate();
    }
  };

  const handleTriggerAnonymize = () => {
    if (confirm('Iniciar manualmente o processo de anonimização para dados antigos agora?')) {
      triggerAnonymizeMutation.mutate();
    }
  };

  const isLoading = isLoadingUsers || isLoadingLogs;
  const combinedError = errorUsers || errorLogs;

  return (
    <div>
      <h2 className="text-3xl font-bold mb-8 text-primary"><FontAwesomeIcon icon={faUsersCog} className="mr-2" />Painel Administrativo</h2>

       {isLoading && <div className="flex justify-center py-10"><Spinner size="lg" /></div>}
       {combinedError && <Alert type="error" title="Erro ao Carregar Dados do Admin" message={combinedError.message} className="mb-6"/>}

       {!isLoading && !combinedError && (
        <>
          {/* Action Buttons */}
          <section className="mb-10">
            <h3 className="text-xl font-semibold mb-4 text-neutral-dark">Ações Administrativas</h3>
            <div className="flex flex-wrap gap-4"> {/* Use flex-wrap and gap */}
              <Button
                variant="secondary"
                onClick={handleTriggerBackup}
                loading={triggerBackupMutation.isLoading}
                disabled={triggerBackupMutation.isLoading}
              >
                <FontAwesomeIcon icon={faDownload} className="mr-2" /> Iniciar Backup BD
              </Button>
              <Button
                variant="warning" // Ensure you have a warning variant or use secondary/danger
                onClick={handleTriggerAnonymize}
                loading={triggerAnonymizeMutation.isLoading}
                disabled={triggerAnonymizeMutation.isLoading}
              >
                 <FontAwesomeIcon icon={faUserShield} className="mr-2" /> Iniciar Anonimização
              </Button>
            </div>
            {triggerBackupMutation.isError && <Alert type="error" message={`Erro Backup: ${triggerBackupMutation.error.message}`} className="mt-4" />}
            {triggerAnonymizeMutation.isError && <Alert type="error" message={`Erro Anonimização: ${triggerAnonymizeMutation.error.message}`} className="mt-4" />}
          </section>

          {/* User Management Table */}
          <section className="mb-10">
             <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-neutral-dark">Gerenciamento de Usuários</h3>
                <Button variant="ghost" size="sm" onClick={refetchUsers} disabled={isLoadingUsers}>
                    Atualizar Lista
                </Button>
            </div>
            {isLoadingUsers && <Spinner />}
            {errorUsers && <Alert type="error" title="Erro ao carregar usuários" message={errorUsers.message} />}
            {!isLoadingUsers && !errorUsers && users && (
              <Card className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">E-mail</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Função</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entrou em</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map(user => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <select
                            value={user.role}
                            // Pass userEmail and currentRole for confirmation message
                            onChange={(e) => handleRoleChange(user.id, user.email, user.role, e.target.value)}
                            className="text-sm rounded border-gray-300 focus:ring-primary focus:border-primary disabled:opacity-50"
                            disabled={updateUserMutation.isLoading && updateUserMutation.variables?.id === user.id}
                             aria-label={`Função para ${user.email}`}
                          >
                            <option value="user">Usuário</option>
                            <option value="professional">Profissional</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(user.createdAt).toLocaleDateString('pt-BR')}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDeleteUser(user.id, user.email)}
                            loading={deleteUserMutation.isLoading && deleteUserMutation.variables === user.id}
                            disabled={deleteUserMutation.isLoading || updateUserMutation.isLoading} // Disable if any mutation involving this user is running
                          >
                            Excluir
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}
            {!isLoadingUsers && !errorUsers && (!users || users.length === 0) && (
                 <p className="text-neutral-DEFAULT italic">Nenhum usuário encontrado.</p>
            )}
          </section>

          {/* System Logs */}
          <section>
            <h3 className="text-xl font-semibold mb-4 text-neutral-dark">Logs Recentes do Sistema (Últimos 100)</h3>
            {isLoadingLogs && <Spinner />}
            {errorLogs && <Alert type="error" title="Erro ao carregar logs" message={errorLogs.message} />}
            {!isLoadingLogs && !errorLogs && logs && (
              <Card className="bg-gray-800 text-gray-200 font-mono text-xs p-4 max-h-96 overflow-y-auto">
                <pre>
                  {logs.length > 0 ? logs.join('\n') : 'Nenhum log recente encontrado.'}
                </pre>
              </Card>
            )}
          </section>
        </>
      )}
    </div>
  );
};


// --- Privacy Policy Page (sem alterações) ---
// ... (código existente da PrivacyPolicyPage) ...
const PrivacyPolicyPage = () => {
    return (
      <div className="prose max-w-4xl mx-auto px-4 sm:px-0"> {/* Added padding control */}
        <h1 className="text-primary">Política de Privacidade e Termos de Uso</h1>
        <p><strong>Última Atualização:</strong> {new Date().toLocaleDateString('pt-BR')}</p>

        <h2 className="mt-8 mb-4 text-2xl font-semibold text-neutral-dark">Introdução</h2>
        <p>Bem-vindo(a) ao MindWell Assist. Estamos comprometidos em proteger sua privacidade e tratar seus dados de forma aberta e transparente. Esta política detalha como coletamos, usamos, armazenamos e protegemos suas informações pessoais.</p>

        <h2 className="mt-8 mb-4 text-2xl font-semibold text-neutral-dark">Informações que Coletamos</h2>
        <ul className="space-y-1 list-disc list-outside ml-5 marker:text-primary">
           <li><strong>Informações da Conta:</strong> Se você se registrar, coletamos seu endereço de e-mail e uma versão segura (hash) de sua senha. Seu e-mail pode ser usado para comunicação relacionada à conta (ex: recuperação de senha).</li>
           <li><strong>Dados da Autoavaliação:</strong> Coletamos suas respostas aos questionários PHQ-9 e GAD-7, os scores calculados, o nível de risco e se há indicação de risco suicida. Solicitamos seu consentimento explícito antes de salvar esses dados associados à sua conta (se logado). Respostas de usuários não logados não são salvas.</li>
           <li><strong>Dados do Chat:</strong> Conversas com o assistente de IA (MindGuide) podem ser registradas para garantia de qualidade, segurança e melhoria do serviço. A identificação do usuário (se logado) pode ser associada ao chat para fornecer contexto (como a última avaliação), mas não compartilhamos seu e-mail diretamente com a IA.</li>
           <li><strong>Solicitações de Contato:</strong> Se você usar o formulário "Buscar Ajuda Profissional", coletamos seu nome, detalhes de contato (e-mail/telefone) e a mensagem fornecida. Essas informações são criptografadas.</li>
           <li><strong>Dados de Uso:</strong> Podemos coletar dados anonimizados sobre como você interage com o site (ex: páginas visitadas, recursos usados) usando ferramentas padrão de análise web para melhorar a experiência.</li>
        </ul>

        <h2 className="mt-8 mb-4 text-2xl font-semibold text-neutral-dark">Como Usamos Suas Informações</h2>
         <ul className="space-y-1 list-disc list-outside ml-5 marker:text-primary">
           <li>Para fornecer e operar o serviço (autoavaliações, chat).</li>
           <li>Para armazenar os resultados da avaliação mediante seu consentimento, permitindo que você visualize seu histórico.</li>
           <li>Para fornecer contexto (baseado nos resultados da avaliação) ao assistente de IA para respostas mais relevantes (sem expor dados brutos).</li>
           <li>Para facilitar o contato entre você e profissionais, caso você solicite.</li>
           <li>Para melhorar o site e o desempenho do assistente de IA (usando dados anonimizados ou agregados).</li>
           <li>Para garantir a segurança, monitorar o uso e prevenir abusos.</li>
           <li>Para cumprir obrigações legais.</li>
         </ul>

        <h2 className="mt-8 mb-4 text-2xl font-semibold text-neutral-dark">Armazenamento e Segurança de Dados</h2>
        <ul className="space-y-1 list-disc list-outside ml-5 marker:text-primary">
           <li>Seus dados são armazenados em um banco de dados seguro (SQLite).</li>
           <li>Informações sensíveis como senhas (hash), respostas específicas da avaliação (se armazenadas), detalhes de contato e mensagens de solicitação são criptografadas usando padrões da indústria (AES-256).</li>
           <li>Implementamos medidas de segurança como Helmet, CORS e limitação de taxa para proteger a API.</li>
           <li>O acesso a dados sensíveis é restrito a pessoal autorizado (profissionais, administradores) com base em suas funções.</li>
         </ul>

        <h2 className="mt-8 mb-4 text-2xl font-semibold text-neutral-dark">Retenção e Anonimização de Dados</h2>
         <ul className="space-y-1 list-disc list-outside ml-5 marker:text-primary">
           <li>Dados de autoavaliação associados a um usuário podem ser anonimizados (desvinculados do ID do usuário e respostas detalhadas removidas) após 12 meses de inatividade ou conforme exigido por lei.</li>
           <li>Você pode solicitar a exclusão de sua conta e dados associados (sujeito a requisitos legais).</li>
           <li>Dados anonimizados e agregados podem ser mantidos por períodos mais longos para análise estatística e melhoria do serviço.</li>
         </ul>

        <h2 className="mt-8 mb-4 text-2xl font-semibold text-neutral-dark">Seus Direitos (Conformidade com a LGPD)</h2>
        <p>De acordo com a Lei Geral de Proteção de Dados (LGPD) do Brasil, você tem o direito de:</p>
        <ul className="space-y-1 list-disc list-outside ml-5 marker:text-primary">
           <li>Confirmar a existência de tratamento dos seus dados.</li>
           <li>Acessar os dados pessoais que mantemos sobre você.</li>
           <li>Corrigir informações incompletas, inexatas ou desatualizadas.</li>
           <li>Solicitar anonimização, bloqueio ou eliminação de dados desnecessários, excessivos ou tratados em desconformidade com a LGPD.</li>
           <li>Solicitar a portabilidade dos seus dados a outro fornecedor de serviço ou produto, mediante requisição expressa.</li>
           <li>Solicitar a eliminação dos dados pessoais tratados com o seu consentimento (sujeito a exceções legais).</li>
           <li>Obter informação sobre as entidades públicas e privadas com as quais compartilhamos seus dados.</li>
           <li>Ser informado sobre a possibilidade de não fornecer consentimento e sobre as consequências da negativa.</li>
           <li>Revogar seu consentimento a qualquer momento.</li>
           <li>Reclamar junto à Autoridade Nacional de Proteção de Dados (ANPD).</li>
         </ul>
        <p>Para exercer esses direitos, entre em contato conosco através de [Inserir Método de Contato - ex: privacidade@mindwellassist.com].</p>

        <h2 className="mt-8 mb-4 text-2xl font-semibold text-neutral-dark">Uso de Cookies</h2>
        <p>Usamos cookies necessários para autenticação e gerenciamento de sessão (ex: manter você logado). Podemos usar cookies de análise para rastreamento de uso anonimizado (você pode gerenciar as preferências de cookies através das configurações do seu navegador).</p>

        <h2 className="mt-8 mb-4 text-2xl font-semibold text-neutral-dark">Serviços de Terceiros</h2>
        <ul className="space-y-1 list-disc list-outside ml-5 marker:text-primary">
           <li><strong>OpenAI:</strong> As mensagens do chat (incluindo o contexto sistêmico da sua avaliação, se aplicável) são enviadas para a API da OpenAI (modelo gpt-3.5-turbo ou similar) para gerar respostas. A OpenAI possui sua própria política de privacidade sobre o uso de dados. Não enviamos informações de identificação pessoal (como seu e-mail) diretamente no prompt do chat, a menos que você mesmo as digite.</li>
           {/* Listar outros serviços de terceiros, como ferramentas de análise, se houver */}
         </ul>

        <h2 className="mt-8 mb-4 text-2xl font-semibold text-neutral-dark">Privacidade Infantil</h2>
        <p>Este serviço não se destina a indivíduos menores de 18 anos. Não coletamos intencionalmente dados de crianças ou adolescentes.</p>

        <h2 className="mt-8 mb-4 text-2xl font-semibold text-neutral-dark">Alterações a Esta Política</h2>
        <p>Podemos atualizar esta política periodicamente. Notificaremos sobre mudanças significativas publicando a nova política no site. Seu uso continuado do serviço após as alterações constitui aceitação.</p>

        <h2 className="mt-8 mb-4 text-2xl font-semibold text-neutral-dark">Contato</h2>
        <p>Se tiver dúvidas sobre esta política, entre em contato conosco em [Inserir Email ou Link de Formulário de Contato].</p>

        <hr className="my-8" />

        <h2 className="mt-8 mb-4 text-2xl font-semibold text-neutral-dark">Termos de Uso</h2>
        <ol className="space-y-2 list-decimal list-outside ml-5">
           <li>Este site fornece ferramentas para autoavaliação e informações gerais sobre bem-estar mental. Ele <strong>não</strong> substitui aconselhamento médico profissional, diagnóstico ou tratamento.</li>
           <li>Procure sempre o conselho de seu médico ou outro profissional de saúde qualificado com quaisquer perguntas que possa ter sobre uma condição médica. Nunca ignore o conselho médico profissional ou demore a procurá-lo por causa de algo que você leu neste site.</li>
           <li><strong>Se você está em crise, pensando em se machucar, ou acredita que pode ter uma emergência, ligue imediatamente para os serviços de emergência (190, 192) ou para o CVV (188).</strong></li>
           <li>O assistente de IA (MindGuide) fornece informações e apoio, mas não pode oferecer terapia ou aconselhamento médico. As interações não criam uma relação médico-paciente.</li>
           <li>Você concorda em não usar indevidamente o serviço, tentar acesso não autorizado ou introduzir código malicioso.</li>
           <li>Reservamo-nos o direito de modificar ou descontinuar o serviço a qualquer momento.</li>
           <li>O uso deste serviço é por sua conta e risco. Nós o fornecemos "como está", sem garantias de qualquer tipo.</li>
         </ol>
      </div>
    );
};


// --- Not Found Page (sem alterações) ---
// ... (código existente da NotFoundPage) ...
const NotFoundPage = () => {
  return (
    <div className="text-center py-20">
      <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
      <h2 className="text-3xl font-semibold mb-6">Página Não Encontrada</h2>
      <p className="text-neutral-DEFAULT mb-8">Desculpe, a página que você está procurando não existe ou foi movida.</p>
      <Link to="/">
        <Button variant="primary">Voltar para a Página Inicial</Button>
      </Link>
    </div>
  );
};

// --- Lazy Load da página de áudio ---
const LazyAudioExercisePage = lazy(() => import('./AudioExercisePage.jsx'));

// --- RecursoLayout definido aqui (se não estiver em ui.jsx) ---
const RecursoLayout = ({ children, title, backLink = "/recursos" }) => (
    <Card className="max-w-4xl mx-auto p-6 md:p-8">
      <Link to={backLink} className="text-sm text-primary hover:text-primary-dark mb-6 inline-flex items-center transition-colors">
        <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
        Voltar para Recursos
      </Link>
      <h1 className="text-3xl md:text-4xl font-bold text-primary mb-6 md:mb-8 border-b pb-4">{title}</h1>
      {/* Aplica classes de largura e margem ao container do conteúdo, afetando indiretamente as imagens dentro */}
      <div className="prose prose-neutral lg:prose-lg max-w-none prose-a:text-primary hover:prose-a:text-primary-dark prose-strong:font-semibold prose-img:w-[40rem] prose-img:mx-auto prose-img:rounded-lg prose-img:shadow-sm">
        {children}
      </div>
    </Card>
);


// --- Main Router ---
function Pages() {
  return (
    <Layout>
      <Suspense fallback={<div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>}>
        <Routes>
          {/* Rotas Públicas */}
          <Route path="/" element={<HomePage />} />
          <Route path="/autoavaliacao" element={<AssessmentPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/recursos" element={<ResourcesPage />} />
          <Route path="/privacidade" element={<PrivacyPolicyPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Rotas de Conteúdo de Recursos */}
          <Route path="/recursos/artigo/entendendo-ansiedade" element={<ArtigoEntendendoAnsiedadePage />} />
          <Route path="/recursos/artigo/estrategias-baixo-humor" element={<ArtigoEstrategiasBaixoHumorPage />} />
          <Route path="/recursos/guia/meditacao-mindfulness" element={<GuiaMindfulnessPage />} />
          <Route path="/recursos/artigo/importancia-sono" element={<ArtigoImportanciaSonoPage />} />
          <Route path="/recursos/audio/exercicio-respiracao" element={<LazyAudioExercisePage />} />


          {/* Rotas Protegidas */}
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

          {/* Catch-all 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}

export default Pages;