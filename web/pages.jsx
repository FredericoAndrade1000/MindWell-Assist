import React, { useState, useEffect, Suspense, lazy, useRef } from 'react';
import { Routes, Route, Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import Fuse from 'fuse.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeartPulse, faComments, faBookOpen, faChartLine, faUsersCog, faUserShield, faCheckCircle, faExclamationTriangle, faArrowRight, faSearch, faPaperPlane, faRobot, faUser, faClipboardList, faCalendarAlt, faLock, faArrowLeft, faDownload } from '@fortawesome/free-solid-svg-icons'; // Adicionar ícones necessários
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
  email: yup.string().email('Formato de e-mail inválido').required('E-mail é obrigatório'),
  password: yup.string().min(6, 'A senha deve ter pelo menos 6 caracteres').required('Senha é obrigatória'),
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
          />
          <Input
            label="Senha"
            name="password"
            type="password"
            error={errors.password?.message}
            {...register('password')}
            disabled={isLoading}
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
          />
          <Input
            label="Senha"
            name="password"
            type="password"
            error={errors.password?.message}
            {...register('password')}
            disabled={isLoading}
          />
          <Input
            label="Confirmar Senha"
            name="confirmPassword"
            type="password"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
            disabled={isLoading}
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
            <Link to="/autoavaliacao" className="text-neutral-dark hover:text-primary">Autoavaliação</Link>
            <Link to="/chat" className="text-neutral-dark hover:text-primary">Assistente de Chat</Link>
            <Link to="/recursos" className="text-neutral-dark hover:text-primary">Recursos</Link>
            {isAuthenticated && user?.role === 'professional' && (
              <Link to="/pro/dashboard" className="text-neutral-dark hover:text-primary">Painel</Link>
            )}
            {isAuthenticated && user?.role === 'admin' && (
              <Link to="/admin" className="text-neutral-dark hover:text-primary">Painel Admin</Link>
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

// --- Self-Assessment Page ---

// Questions Data
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

// Yup schema for validation
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
      console.log("Avaliação salva com sucesso");
      // Optionally show a success message or clear form
      setShowConsentModal(false); // Close modal on success
      alert('Os resultados da sua avaliação foram salvos.'); // Simple confirmation
    },
    onError: (error) => {
      console.error("Erro ao salvar avaliação:", error);
      alert(`Falha ao salvar avaliação: ${error.response?.data?.message || error.message}`);
      setShowConsentModal(false); // Close modal on error too
    }
  });

  const calculateResults = (data) => {
    const score_phq = phq9Questions.reduce((sum, q) => sum + (data[q.id] || 0), 0);
    const score_gad = gad7Questions.reduce((sum, q) => sum + (data[q.id] || 0), 0);
    const isSuicidalRisk = (data['q9'] || 0) >= 1;

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
    if (score_phq >= 20 || score_gad >= 15 || isSuicidalRisk) {
      riskLevel = 'ALTO';
    } else if (score_phq >= 10 || score_gad >= 10) {
      riskLevel = 'MODERADO';
    } else {
      riskLevel = 'BAIXO';
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
  };

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
              <label key={option.value} className="inline-flex items-center mb-2 sm:mb-0 cursor-pointer"> {/* Added cursor-pointer */}
                <input
                  type="radio"
                  {...field}
                  value={option.value}
                  checked={field.value === option.value}
                  // Added !important modifier and pointer-events-none
                  className="form-radio h-4 w-4 text-primary focus:ring-primary focus:ring-offset-0 border-gray-300 checked:!bg-primary pointer-events-none"
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
    name: yup.string().required('Nome é obrigatório'),
    contact: yup.string().required('E-mail ou Telefone é obrigatório'), // Can be email or phone
    message: yup.string().required('Mensagem é obrigatória').min(10, 'A mensagem é muito curta'),
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
      {step < 4 && (
        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-6 dark:bg-gray-700">
          <div className="bg-primary h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
        </div>
      )}

      {step === 1 && (
        <Card className="text-center">
          <h2 className="text-2xl font-bold mb-4 text-primary">Autoavaliação de Saúde Mental</h2>
          <p className="mb-6 text-neutral-DEFAULT">Esta ferramenta inclui os questionários PHQ-9 (para depressão) e GAD-7 (para ansiedade). Suas respostas são confidenciais. Não é uma ferramenta de diagnóstico, mas pode ajudá-lo(a) a entender seus sentimentos.</p>
          <p className="mb-6 text-sm text-neutral-DEFAULT">Nas últimas <strong>2 semanas</strong>, com que frequência você foi incomodado(a) pelos seguintes problemas?</p>
          <Button onClick={() => setStep(2)} variant="primary" size="lg">
            Iniciar Avaliação <FontAwesomeIcon icon={faArrowRight} className="ml-2" />
          </Button>
        </Card>
      )}

      {step === 2 && (
        <form> {/* No onSubmit here, handled by button */}
          <h3 className="text-xl font-semibold mb-4">Parte 1: Depressão (PHQ-9)</h3>
          {phq9Questions.map(renderQuestion)}
          <div className="text-right">
            <Button onClick={handleNextStep} variant="primary">
              Próximo: Perguntas de Ansiedade <FontAwesomeIcon icon={faArrowRight} className="ml-2" />
            </Button>
          </div>
        </form>
      )}

      {step === 3 && (
        <form onSubmit={handleSubmit(onSubmit)}> {/* Submit on final step */}
          <h3 className="text-xl font-semibold mb-4">Parte 2: Ansiedade (GAD-7)</h3>
          {gad7Questions.map(renderQuestion)}
          <div className="flex justify-between items-center mt-6">
            <Button onClick={() => setStep(2)} variant="outline">Voltar</Button>
            <Button type="submit" variant="primary" disabled={!isValid}>
              Ver Resultados <FontAwesomeIcon icon={faCheckCircle} className="ml-2" />
            </Button>
          </div>
        </form>
      )}

      {step === 4 && results && (
        <Card>
          <h2 className="text-2xl font-bold mb-6 text-center text-primary">Resultados da Sua Avaliação</h2>

          {results.isSuicidalRisk && (
            <Alert type="danger" className="mb-6">
              <div className='flex items-center'>
                <FontAwesomeIcon icon={faExclamationTriangle} className="text-xl mr-3" />
                <div>
                  <p className="font-bold">Aviso Importante de Segurança</p>
                  <p>Suas respostas indicam pensamentos de automutilação. Se você estiver em perigo imediato, entre em contato com os serviços de emergência (por exemplo, 190, 192, 188 - CVV) ou uma linha direta de crise imediatamente. A ajuda está disponível.</p>
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

          <div className={`text-center p-4 rounded-lg mb-8 ${results.riskLevel === 'ALTO' ? 'bg-red-100 border border-red-300' :
            results.riskLevel === 'MODERADO' ? 'bg-yellow-100 border border-yellow-300' :
              'bg-green-100 border border-green-300'
            }`}>
            <h3 className="text-lg font-semibold">Nível de Risco Geral:
              <span className={`ml-2 font-bold ${results.riskLevel === 'ALTO' ? 'text-red-700' :
                results.riskLevel === 'MODERADO' ? 'text-yellow-700' :
                  'text-green-700'
                }`}>{results.riskLevel}</span>
            </h3>
          </div>

          <p className="text-neutral-DEFAULT mb-6">Estes resultados são baseados nos sintomas que você relatou nas últimas duas semanas. Eles não são um diagnóstico. Considere discutir esses resultados com um profissional de saúde.</p>

          <div className="flex flex-col md:flex-row justify-center gap-4">
            <Button onClick={() => navigate('/chat')} variant="primary">
              <FontAwesomeIcon icon={faComments} className="mr-2" /> Conversar com Assistente de IA
            </Button>
            <Button onClick={() => setContactModalOpen(true)} variant="secondary">
              <FontAwesomeIcon icon={faUserShield} className="mr-2" /> Buscar Ajuda Profissional
            </Button>
            <Button onClick={handleSaveResults} variant="outline">
              Salvar Resultados (Requer Consentimento)
            </Button>
          </div>


          {/* Contact Professional Modal */}
          <Modal isOpen={isContactModalOpen} onClose={() => setContactModalOpen(false)} title="Solicitar Contato Profissional">
            <form onSubmit={handleContactSubmit(onContactSubmit)}>
              <p className="text-sm text-neutral-DEFAULT mb-4">Forneça seus detalhes. Um profissional de saúde mental pode entrar em contato com você. Suas informações de contato serão mantidas confidenciais.</p>
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
                rows={4}
                error={contactErrors.message?.message}
                {...registerContact('message')}
                disabled={appointmentMutation.isLoading}
              />
              <div className="mt-4 flex justify-end space-x-2">
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

      {/* Consent Modal */}
      <Modal isOpen={showConsentModal} onClose={() => setShowConsentModal(false)} title="Consentimento para Salvar Dados">
        <div className="text-sm">
          <p className="mb-4">Precisamos da sua permissão para salvar os resultados da sua avaliação. Veja como seus dados serão usados:</p>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <li>Para permitir que você (se conectado) ou profissionais (anonimamente se não conectado) acompanhem tendências gerais.</li>
            <li>Para ajudar a melhorar nossos serviços e entender as necessidades dos usuários (os dados são agregados e anonimizados).</li>
            <li>Detalhes sensíveis como respostas específicas podem ser armazenados criptografados.</li>
            <li>Dados com mais de 12 meses podem ser automaticamente anonimizados ou excluídos.</li>
          </ul>
          <p className="mb-4">Você pode ler nossa <Link to="/privacidade" className="text-primary underline" target="_blank">Política de Privacidade</Link> completa para mais detalhes.</p>
          <p className="font-semibold">Você consente em salvar os resultados da sua avaliação?</p>
        </div>
        <div className="mt-6 flex justify-end space-x-3">
          <Button variant="outline" onClick={() => setShowConsentModal(false)} disabled={mutation.isLoading}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleConsentAndSave} loading={mutation.isLoading} disabled={mutation.isLoading}>
            Sim, Eu Consinto
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
      setMessages(prev => [...prev, { role: 'assistant', content: "Desculpe, encontrei um erro. Por favor, tente novamente mais tarde." }]);
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
        <FontAwesomeIcon icon={faComments} className="mr-2" /> Chat com Assistente de IA
      </div>
      <div className="flex-grow p-4 overflow-y-auto space-y-4">
        {/* Initial message from bot */}
        {messages.length === 0 && (
          <div className="flex items-start space-x-3">
            <FontAwesomeIcon icon={faRobot} className="text-primary text-xl mt-1" />
            <div className="bg-gray-100 p-3 rounded-lg max-w-xs sm:max-w-md">
              <p className="text-sm">Olá! Eu sou o MindGuide, seu assistente de IA. Como posso ajudá-lo(a) hoje? Você pode me perguntar sobre bem-estar mental ou como as avaliações funcionam.</p>
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
              <Spinner size="sm" color="neutral" className="mr-2" />
              <span className="text-sm italic text-neutral-DEFAULT">MindGuide está pensando...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} /> {/* Anchor for scrolling */}
      </div>
      <form onSubmit={handleSend} className="p-4 border-t flex items-center space-x-2 bg-gray-50"> {/* Changed items-end back to items-center */}
        <Input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Digite sua mensagem..."
          className="flex-grow !mb-0 py-2" // Override margin bottom and added py-2
          disabled={mutation.isLoading}
          aria-label="Entrada do chat"
        />
        <Button
          type="submit"
          variant="primary"
          disabled={mutation.isLoading || !input.trim()}
          className="!px-3 !py-2" // Re-added custom padding override
        >
          <FontAwesomeIcon icon={faPaperPlane} />
        </Button>
      </form>
    </div>
  );
};

// --- Resources Page ---
// Static data for now, could be fetched from API: GET /resources
// NOTE: Full translation of content fields might be needed if they are displayed
const resourceData = [
  { id: 1, type: 'Artigo', title: 'Entendendo a Ansiedade', description: 'Aprenda sobre os sintomas comuns e tipos de transtornos de ansiedade.', content: 'A ansiedade é uma emoção humana normal... (conteúdo completo do artigo aqui)' },
  { id: 2, type: 'Artigo', title: 'Estratégias para Lidar com o Baixo Humor', description: 'Dicas práticas para ajudar a gerenciar sentimentos de depressão ou tristeza.', content: 'Quando se sentir para baixo, pequenos passos podem fazer a diferença... ' },
  { id: 3, type: 'Guia', title: 'Guia de Meditação Mindfulness (PDF)', description: 'Um guia passo a passo para iniciar uma prática de mindfulness.', link: '/resources/mindfulness-guide.pdf' }, // Needs actual PDF
  { id: 4, type: 'Áudio', title: 'Exercício de Respiração de 5 Minutos', description: 'Um áudio guiado curto para relaxamento rápido.', audioSrc: '/audio/breathing-exercise.mp3' }, // Needs actual MP3
  { id: 5, type: 'Artigo', title: 'A Importância do Sono para a Saúde Mental', description: 'Explore a conexão entre a qualidade do sono e o bem-estar emocional.', content: 'O sono é crucial para...' },
  { id: 6, type: 'Link Externo', title: 'CVV (Centro de Valorização da Vida)', description: 'Ligue 188. Serviço de apoio emocional e prevenção do suicídio (Brasil).', link: 'https://www.cvv.org.br/', external: true }, // Localized example
];

const fuseOptions = {
  keys: ['title', 'description', 'type'],
  threshold: 0.4, // Adjust sensitivity
};

const ResourcesPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  // const [filteredResources, setFilteredResources] = useState(resourceData); // Será atualizado pelo useEffect
  const [selectedResource, setSelectedResource] = useState(null);
  const [isModalOpen, setModalOpen] = useState(false);
  const audioRef = useRef(null);
  const navigate = useNavigate(); // Adicionar useNavigate

  // *** ATUALIZAR resourceData com os caminhos das novas páginas ***
  const resourceData = [
    { id: 1, type: 'Artigo', title: 'Entendendo a Ansiedade', description: 'Aprenda sobre os sintomas comuns e tipos de transtornos de ansiedade.', pagePath: '/recursos/artigo/entendendo-ansiedade' }, // Adicionado pagePath
    { id: 2, type: 'Artigo', title: 'Estratégias para Lidar com o Baixo Humor', description: 'Dicas práticas para ajudar a gerenciar sentimentos de depressão ou tristeza.', pagePath: '/recursos/artigo/estrategias-baixo-humor' }, // Adicionado pagePath
    { id: 3, type: 'Guia', title: 'Guia de Meditação Mindfulness', description: 'Um guia passo a passo para iniciar uma prática de mindfulness, com link para PDF.', pagePath: '/recursos/guia/meditacao-mindfulness', link: '/resources/mindfulness-guide.pdf' }, // Adicionado pagePath (página terá o link de download)
    { id: 4, type: 'Áudio', title: 'Exercício de Respiração de 5 Minutos', description: 'Um áudio guiado curto para relaxamento rápido.', audioSrc: '/audio/breathing-exercise.mp3' }, // Mantém modal ou link direto
    { id: 5, type: 'Artigo', title: 'A Importância do Sono para a Saúde Mental', description: 'Explore a conexão entre a qualidade do sono e o bem-estar emocional.', pagePath: '/recursos/artigo/importancia-sono' }, // Adicionado pagePath
    { id: 6, type: 'Link Externo', title: 'CVV (Centro de Valorização da Vida)', description: 'Ligue 188. Serviço de apoio emocional e prevenção do suicídio (Brasil).', link: 'https://www.cvv.org.br/', external: true },
  ];

  const fuse = new Fuse(resourceData, fuseOptions);
  const [filteredResources, setFilteredResources] = useState(resourceData); // Inicializa com todos

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredResources(resourceData);
    } else {
      const results = fuse.search(searchTerm);
      setFilteredResources(results.map(result => result.item));
    }
  }, [searchTerm]); // Removido resourceData daqui pois agora é constante

  // *** ATUALIZAR openResource para usar navigate ***
  const openResource = (resource) => {
    if (resource.pagePath) { // Se tem um pagePath definido, navega para lá
      navigate(resource.pagePath);
    } else if (resource.external) {
      window.open(resource.link, '_blank', 'noopener,noreferrer');
    } else if (resource.type === 'Áudio') { // Manter modal para áudio
      setSelectedResource(resource);
      setModalOpen(true);
    } else if (resource.link) { // Fallback para outros links internos/externos sem pagePath
      window.open(resource.link, '_blank', 'noopener,noreferrer');
    }
    // Adicione outras condições se necessário para tipos futuros
  };


  const closeModal = () => {
    setModalOpen(false);
    setSelectedResource(null);
    if (audioRef.current) {
      audioRef.current.pause();
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
          <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        </div>

      {filteredResources.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResources.map(resource => (
            <Card key={resource.id} className="flex flex-col justify-between hover:shadow-lg transition-shadow">
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
              <Button onClick={() => openResource(resource)} variant="outline" size="sm" className="mt-auto">
                {/* Atualizar texto do botão dinamicamente */}
                {resource.pagePath ? (resource.type === 'Artigo' ? 'Ler Artigo' : 'Ver Guia') :
                 resource.external ? 'Visitar Link' :
                 resource.type === 'Áudio' ? 'Ouvir Áudio' :
                 'Ver Recurso'} <FontAwesomeIcon icon={faArrowRight} className="ml-1" />
              </Button>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-center text-neutral-DEFAULT italic">Nenhum recurso encontrado para sua busca.</p>
      )}


      {/* Resource Modal (agora usado primariamente para áudio ou outros tipos não-página) */}
      <Modal isOpen={isModalOpen} onClose={closeModal} title={selectedResource?.title}>
        {selectedResource && (
          <div>
            {selectedResource.type === 'Áudio' && (
              <div className="text-center">
                <p className="mb-4">{selectedResource.description}</p>
                {/* Placeholder para imagem do áudio */}
                [IMAGEM: Ícone de ondas sonoras ou fone de ouvido]
                <audio controls ref={audioRef} src={selectedResource.audioSrc} className="w-full mt-4">
                  Seu navegador não suporta o elemento de áudio.
                </audio>
              </div>
            )}
            {/* Adicionar renderização para outros tipos que ainda usam modal */}
            {/* Exemplo:
            {selectedResource.type === 'Video' && ( ... )}
            */}
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

  const kpiError = errorStats ? 'Erro ao carregar KPIs' : null;
  const assessmentError = errorAssessments ? 'Erro ao carregar avaliações' : null;
  const appointmentError = errorAppointments ? 'Erro ao carregar solicitações' : null;

  // Placeholder data if stats are unavailable
  const displayStats = stats || { highRiskToday: 0, totalAssessmentsMonth: 0, newContactsPending: appointments?.length || 0 };

  return (
    <div>
      <h2 className="text-3xl font-bold mb-8 text-primary"><FontAwesomeIcon icon={faChartLine} className="mr-2" />Painel Profissional</h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <Card className={kpiError ? 'border-l-4 border-danger' : ''}>
          <h3 className="text-lg font-semibold text-neutral-DEFAULT mb-2">Alto Risco Hoje</h3>
          {kpiError ? <p className="text-danger text-sm">{kpiError}</p> : <p className="text-4xl font-bold text-danger">{displayStats.highRiskToday ?? 'N/D'}</p>}
        </Card>
        <Card className={kpiError ? 'border-l-4 border-danger' : ''}>
          <h3 className="text-lg font-semibold text-neutral-DEFAULT mb-2">Avaliações (Este Mês)</h3>
          {kpiError ? <p className="text-danger text-sm">{kpiError}</p> : <p className="text-4xl font-bold text-primary">{displayStats.totalAssessmentsMonth ?? 'N/D'}</p>}
        </Card>
        <Card className={appointmentError ? 'border-l-4 border-danger' : ''}>
          <h3 className="text-lg font-semibold text-neutral-DEFAULT mb-2">Solicitações de Contato Pendentes</h3>
          {appointmentError ? <p className="text-danger text-sm">{appointmentError}</p> : <p className="text-4xl font-bold text-secondary-dark">{displayStats.newContactsPending ?? 'N/D'}</p>}
        </Card>
      </div>

      {/* Recent High-Risk Assessments Table */}
      <section className="mb-10">
        <h3 className="text-2xl font-semibold mb-4 text-neutral-dark">Avaliações Recentes (Priorizando Alto Risco)</h3>
        {assessmentError && <Alert type="error" message={assessmentError} />}
        {!assessmentError && (!assessments || assessments.length === 0) && <p className="text-neutral-DEFAULT italic">Nenhuma avaliação recente encontrada.</p>}
        {!assessmentError && assessments && assessments.length > 0 && (
          <Card className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nível de Risco</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PHQ-9</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">GAD-7</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Risco Suicida?</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuário</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {assessments.sort((a, b) => { // Sort to bring HIGH risk first, then by date
                  const riskOrder = { 'ALTO': 0, 'MODERADO': 1, 'BAIXO': 2 }; // Use translated keys if they match the backend riskLevel strings
                  if (riskOrder[a.riskLevel] !== riskOrder[b.riskLevel]) {
                    return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
                  }
                  return new Date(b.createdAt) - new Date(a.createdAt);
                }).map((assessment) => (
                  <tr key={assessment.id} className={`${assessment.riskLevel === 'ALTO' ? 'bg-red-50' : assessment.riskLevel === 'MODERADO' ? 'bg-yellow-50' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(assessment.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${assessment.riskLevel === 'ALTO' ? 'bg-red-100 text-red-800' :
                        assessment.riskLevel === 'MODERADO' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>{assessment.riskLevel}</span>
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
        {appointmentError && <Alert type="error" message={appointmentError} />}
        {!appointmentError && (!appointments || appointments.length === 0) && <p className="text-neutral-DEFAULT italic">Nenhuma solicitação pendente.</p>}
        {!appointmentError && appointments && appointments.length > 0 && (
          <div className="space-y-4">
            {appointments.map(appt => (
              <Card key={appt.id}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-gray-500">Recebido: {new Date(appt.createdAt).toLocaleString()}</p>
                    <p className="font-semibold mt-1">De: {appt.patientName} ({appt.patientContact})</p>
                    <p className="mt-2 text-sm text-gray-700">{appt.message || 'Nenhuma mensagem fornecida.'}</p>
                  </div>
                  <div className="flex flex-col space-y-2 items-end flex-shrink-0 ml-4">
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
                      Cancelar/Rejeitar
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
      alert('Função do usuário atualizada.');
    },
    onError: (error) => alert(`Erro ao atualizar usuário: ${error.response?.data?.message || error.message}`)
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id) => apiClient.delete(`/admin/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['adminUsers']);
      alert('Usuário excluído.');
    },
    onError: (error) => alert(`Erro ao excluir usuário: ${error.response?.data?.message || error.message}`)
  });

  const triggerBackupMutation = useMutation({
    mutationFn: () => apiClient.post('/admin/backup'),
    onSuccess: (data) => alert(`Backup realizado com sucesso: ${data.data?.message || 'OK'}`), // Updated to check data.data.message
    onError: (error) => alert(`Erro ao iniciar backup: ${error.response?.data?.message || error.message}`)
  });

  const triggerAnonymizeMutation = useMutation({
    mutationFn: () => apiClient.post('/admin/anonymize'),
    onSuccess: (data) => alert(`Tarefa de anonimização iniciada: ${data.data?.message || 'OK'}`), // Updated to check data.data.message
    onError: (error) => alert(`Erro ao iniciar anonimização: ${error.response?.data?.message || error.message}`)
  });

  // --- Handlers ---
  const handleRoleChange = (userId, newRole) => {
    if (confirm(`Alterar a função do usuário ${userId} para ${newRole}?`)) {
      updateUserMutation.mutate({ id: userId, role: newRole });
    }
  };

  const handleDeleteUser = (userId, userEmail) => {
    if (confirm(`Tem certeza de que deseja excluir o usuário ${userEmail} (ID: ${userId})? Esta ação não pode ser desfeita.`)) {
      deleteUserMutation.mutate(userId);
    }
  };

  const handleTriggerBackup = () => {
    if (confirm('Tem certeza de que deseja iniciar um backup do banco de dados agora?')) {
      triggerBackupMutation.mutate();
    }
  };

  const handleTriggerAnonymize = () => {
    if (confirm('Tem certeza de que deseja iniciar manually o processo de anonimização para dados antigos?')) { // Corrected typo
      triggerAnonymizeMutation.mutate();
    }
  };


  return (
    <div>
      <h2 className="text-3xl font-bold mb-8 text-primary"><FontAwesomeIcon icon={faUsersCog} className="mr-2" />Painel Administrativo</h2>

      {/* Action Buttons */}
      <section className="mb-10">
        <h3 className="text-xl font-semibold mb-4 text-neutral-dark">Ações Administrativas</h3>
        <div className="flex space-x-4">
          <Button
            variant="secondary"
            onClick={handleTriggerBackup}
            loading={triggerBackupMutation.isLoading}
            disabled={triggerBackupMutation.isLoading}
          >
            Iniciar Backup do BD Agora
          </Button>
          <Button
            variant="warning" // Assuming you add a warning variant or use secondary/danger
            onClick={handleTriggerAnonymize}
            loading={triggerAnonymizeMutation.isLoading}
            disabled={triggerAnonymizeMutation.isLoading}
          >
            Iniciar Anonimização Agora
          </Button>
          {/* Add Feature Flag Toggles here if implemented */}
        </div>
        {triggerBackupMutation.isError && <Alert type="error" message={triggerBackupMutation.error.message} className="mt-4" />}
        {triggerAnonymizeMutation.isError && <Alert type="error" message={triggerAnonymizeMutation.error.message} className="mt-4" />}
      </section>

      {/* User Management Table */}
      <section className="mb-10">
        <h3 className="text-xl font-semibold mb-4 text-neutral-dark">Gerenciamento de Usuários</h3>
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
                      {/* Simple Select for role change */}
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        className="text-sm rounded border-gray-300 focus:ring-primary focus:border-primary"
                        disabled={updateUserMutation.isLoading && updateUserMutation.variables?.id === user.id}
                      >
                        <option value="user">Usuário</option>
                        <option value="professional">Profissional</option>
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
                        Excluir
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
        <h3 className="text-xl font-semibold mb-4 text-neutral-dark">Logs Recentes do Sistema</h3>
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

    </div>
  );
};

// --- Privacy Policy Page ---
const PrivacyPolicyPage = () => {
  return (
    <div className="prose max-w-4xl mx-auto"> {/* Using Tailwind Typography for basic styling */}
      <h1 className="text-primary">Política de Privacidade e Termos de Uso</h1>
      <p><strong>Última Atualização:</strong> {new Date().toLocaleDateString()}</p>

      <h2>Introdução</h2>
      {/* NOTE: Full paragraph translation needed below */}
      <p>Welcome to MindWell Assist. We are committed to protecting your privacy and handling your data in an open and transparent manner. This policy details how we collect, use, store, and protect your personal information.</p>

      <h2>Informações que Coletamos</h2>
      {/* NOTE: Full list item translations needed below */}
      <ul>
        <li><strong>Informações da Conta:</strong> If you register, we collect your email address and hashed password.</li>
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
      </ul>
    </div>
  );
};

// --- Not Found Page ---
const NotFoundPage = () => {
  return (
    <div className="text-center py-20">
      <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
      <h2 className="text-3xl font-semibold mb-6">Página Não Encontrada</h2>
      <p className="text-neutral-DEFAULT mb-8">Desculpe, a página que você está procurando não existe.</p>
      <Link to="/">
        <Button variant="primary">Voltar para a Página Inicial</Button>
      </Link>
    </div>
  );
};


// --- Componentes de Página de Recurso (NOVOS) ---

const RecursoLayout = ({ children, title, backLink = "/recursos" }) => (
  // Added padding (p-6 md:p-8) and removed prose from Card, applied directly below
  <Card className="max-w-4xl mx-auto p-6 md:p-8">
    <Link to={backLink} className="text-sm text-primary hover:text-primary-dark mb-6 inline-flex items-center transition-colors">
      <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
      Voltar para Recursos
    </Link>
    {/* Enhanced title styling */}
    <h1 className="text-3xl md:text-4xl font-bold text-primary mb-6 md:mb-8 border-b pb-4">{title}</h1>
    {/* Apply prose classes here for content styling, added max-width */}
    <div className="prose prose-neutral lg:prose-lg max-w-none prose-a:text-primary hover:prose-a:text-primary-dark prose-strong:font-semibold">
      {children}
    </div>
    {/* Placeholder para imagem de rodapé comum ou banner se desejar */}
    {/* <div className="mt-8 pt-6 border-t text-center">
      [IMAGEM: Banner genérico de bem-estar ou logo]
    </div> */}
  </Card>
);

// Helper for styling image placeholders
const ImagePlaceholder = ({ text }) => (
  <div className="my-6 p-8 bg-gray-100 border border-dashed border-gray-300 rounded-lg text-center text-gray-500 italic">
    [IMAGEM: {text}]
  </div>
);


// --- Artigo: Entendendo a Ansiedade ---
const ArtigoEntendendoAnsiedadePage = () => (
  <RecursoLayout title="Entendendo a Ansiedade">
    <p className="lead">A ansiedade é uma emoção humana normal e geralmente saudável. No entanto, quando uma pessoa sente regularmente níveis desproporcionais de ansiedade, pode tornar-se uma condição médica.</p>

    <h2 className="mt-8 mb-4 text-2xl font-semibold text-neutral-dark">O que é Ansiedade?</h2>
    <p>A ansiedade é a resposta natural do corpo ao estresse. É um sentimento de medo ou apreensão sobre o que está por vir. O primeiro dia de escola, ir a uma entrevista de emprego ou fazer um discurso podem causar sentimentos de medo e nervosismo na maioria das pessoas.</p>
    <p>Mas se seus sentimentos de ansiedade são extremos, duram mais de seis meses e estão interferindo na sua vida, você pode ter um transtorno de ansiedade.</p>
    <ImagePlaceholder text="Diagrama simples mostrando a diferença entre ansiedade normal e transtorno de ansiedade" />

    <h2 className="mt-8 mb-4 text-2xl font-semibold text-neutral-dark">Sintomas Comuns de Transtornos de Ansiedade</h2>
    <p>Os transtornos de ansiedade podem se manifestar de várias maneiras. Os sintomas comuns incluem:</p>
    {/* Added spacing and marker color to list items */}
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
    <ImagePlaceholder text="Ilustração de uma pessoa experienciando alguns sintomas físicos da ansiedade (ex: coração acelerado, sudorese)" />

    <h2 className="mt-8 mb-4 text-2xl font-semibold text-neutral-dark">Tipos de Transtornos de Ansiedade</h2>
    <p>Existem vários tipos de transtornos de ansiedade, incluindo:</p>
    <ul className="space-y-1 list-disc list-outside ml-5 marker:text-primary">
      <li><strong>Transtorno de Ansiedade Generalizada (TAG):</strong> Preocupação excessiva com atividades ou eventos cotidianos.</li>
      <li><strong>Transtorno do Pânico:</strong> Episódios repetidos de sentimentos súbitos de ansiedade intensa e medo ou terror que atingem um pico em minutos (ataques de pânico).</li>
      <li><strong>Fobias Específicas:</strong> Ansiedade significativa quando exposto a um objeto ou situação específica e um desejo de evitá-lo.</li>
      <li><strong>Transtorno de Ansiedade Social (Fobia Social):</strong> Níveis elevados de ansiedade, medo e evitação de situações sociais devido a sentimentos de constrangimento, autoconsciência e preocupação em ser julgado ou visto negativamente por outros.</li>
    </ul>
    <ImagePlaceholder text="Ícones representando diferentes tipos de transtornos de ansiedade" />

    <h2 className="mt-8 mb-4 text-2xl font-semibold text-neutral-dark">Quando Procurar Ajuda</h2>
    <p>Se a ansiedade está interferindo no seu trabalho, relacionamentos ou outras partes da sua vida, ou se você está tendo dificuldade em controlar suas preocupações, considere falar com um profissional de saúde mental. Tratamentos como terapia e medicação podem ajudar significativamente.</p>
    <p>Você pode usar nossa <Link to="/autoavaliacao">ferramenta de autoavaliação</Link> ou <Link to="/chat">conversar com nosso assistente</Link> para obter mais informações.</p>
  </RecursoLayout>
);

// --- Artigo: Estratégias para Lidar com o Baixo Humor ---
const ArtigoEstrategiasBaixoHumorPage = () => (
  <RecursoLayout title="Estratégias para Lidar com o Baixo Humor">
    <p className="lead">Sentir-se para baixo ou triste ocasionalmente é uma parte normal da vida. No entanto, se esses sentimentos persistirem e começarem a afetar seu dia a dia, é importante procurar maneiras de lidar e buscar apoio.</p>

    <h2 className="mt-8 mb-4 text-2xl font-semibold text-neutral-dark">Reconhecendo o Baixo Humor vs. Depressão</h2>
    <p>O baixo humor geralmente é temporário e ligado a eventos específicos ou estresse. A depressão é uma condição de saúde mental mais persistente e grave, caracterizada por tristeza profunda, perda de interesse e outros sintomas que afetam significativamente a vida diária.</p>
    <ImagePlaceholder text="Gráfico simples comparando características de baixo humor passageiro e depressão clínica" />

    <h2 className="mt-8 mb-4 text-2xl font-semibold text-neutral-dark">Estratégias Práticas de Autocuidado</h2>
    <p>Pequenos passos podem fazer uma grande diferença quando você está se sentindo para baixo:</p>
    <ul className="space-y-3 list-disc list-outside ml-5 marker:text-primary">
      <li>
        <strong>Mova seu corpo:</strong> A atividade física libera endorfinas, que podem melhorar o humor. Mesmo uma curta caminhada pode ajudar.
        <ImagePlaceholder text="Pessoa caminhando ao ar livre em um ambiente agradável" />
      </li>
      <li><strong>Conecte-se com outros:</strong> Falar com amigos, familiares ou um grupo de apoio pode reduzir sentimentos de isolamento.</li>
      <li><strong>Pratique a Atenção Plena (Mindfulness):</strong> Técnicas como meditação ou respiração profunda podem ajudar a acalmar a mente e focar no presente. Veja nosso <Link to="/recursos/guia/meditacao-mindfulness">guia de mindfulness</Link>.</li>
      <li><strong>Estabeleça pequenas metas alcançáveis:</strong> Concluir tarefas, por menores que sejam, pode proporcionar uma sensação de realização.</li>
      <li><strong>Mantenha uma rotina:</strong> Ter horários regulares para dormir, comer e realizar atividades pode trazer estrutura e estabilidade.</li>
      <li>
        <strong>Alimente-se bem:</strong> Uma dieta equilibrada pode impactar positivamente o humor e os níveis de energia.
        <ImagePlaceholder text="Foto colorida de frutas, vegetais e alimentos nutritivos" />
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
    <ImagePlaceholder text="Ilustração de duas mãos se apoiando ou uma pessoa conversando com um terapeuta (de forma genérica)" />
  </RecursoLayout>
);

// --- Guia: Meditação Mindfulness ---
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
    <ImagePlaceholder text="Ícones representando os benefícios da mindfulness (cérebro calmo, coração, foco, etc.)" />

    <h2 className="mt-8 mb-4 text-2xl font-semibold text-neutral-dark">Como Começar: Um Guia Simples</h2>
    {/* Added spacing to list items */}
    <ol className="space-y-3 list-decimal list-outside ml-5">
      <li><strong>Encontre um lugar tranquilo:</strong> Escolha um local onde você não seja interrompido por alguns minutos.</li>
      <li>
          <strong>Sente-se confortavelmente:</strong> Você pode sentar em uma cadeira com os pés no chão, ou no chão com as pernas cruzadas. Mantenha a coluna ereta, mas relaxada.
          <ImagePlaceholder text="Ilustração simples de uma pessoa sentada em postura de meditação (cadeira e chão)" />
      </li>
      <li><strong>Feche os olhos ou suavize o olhar:</strong> Se preferir manter os olhos abertos, fixe o olhar suavemente em um ponto à sua frente.</li>
      <li><strong>Preste atenção à sua respiração:</strong> Observe a sensação do ar entrando e saindo do seu corpo. Sinta o abdômen ou o peito subindo e descendo. Não tente controlar a respiração, apenas observe.</li>
      <li><strong>Note quando sua mente divagar:</strong> É normal que pensamentos, emoções ou sensações surjam. Quando perceber que sua mente divagou, reconheça gentilmente para onde ela foi (ex: "pensando") e, sem julgamento, traga sua atenção de volta para a respiração.</li>
      <li><strong>Comece com pouco tempo:</strong> Tente meditar por 5 minutos no início e aumente gradualmente o tempo conforme se sentir confortável.</li>
    </ol>

    <h2 className="mt-8 mb-4 text-2xl font-semibold text-neutral-dark">Recursos Adicionais</h2>
    <p>Para um guia mais detalhado e para impressão, você pode baixar nosso guia completo em PDF.</p>
    <ImagePlaceholder text="Miniatura ou capa estilizada do Guia de Meditação Mindfulness em PDF" />
    <div className="mt-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
      <a href="/resources/mindfulness-guide.pdf" target="_blank" rel="noopener noreferrer" download className="inline-block">
        <Button variant="primary">
          <FontAwesomeIcon icon={faDownload} className="mr-2" />
          Baixar Guia Completo (PDF)
        </Button>
      </a>
      {/* Changed button to Link for potential navigation */}
      <Link to="#" onClick={(e) => { e.preventDefault(); alert('Funcionalidade de áudio a ser implementada ou link para modal/página de áudio'); }} className="text-sm text-primary hover:underline">
        Experimente nosso Exercício de Respiração (Áudio)
      </Link>
    </div>
  </RecursoLayout>
);

// --- Artigo: A Importância do Sono para a Saúde Mental ---
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
    <ImagePlaceholder text="Ilustração estilizada de um cérebro com setas indicando atividade de limpeza/consolidação durante o sono" />

    <h2 className="mt-8 mb-4 text-2xl font-semibold text-neutral-dark">Impacto da Privação do Sono na Saúde Mental</h2>
    <p>A falta crônica de sono está associada a um risco aumentado ou agravamento de várias condições de saúde mental, incluindo:</p>
    <ul className="space-y-1 list-disc list-outside ml-5 marker:text-primary">
      <li>Depressão</li>
      <li>Transtornos de Ansiedade</li>
      <li>Transtorno Bipolar</li>
      <li>Transtorno de Déficit de Atenção e Hiperatividade (TDAH)</li>
    </ul>
    <p>A relação é muitas vezes bidirecional: problemas de saúde mental podem causar insônia, e a insônia pode piorar os problemas de saúde mental.</p>
    <ImagePlaceholder text="Diagrama simples mostrando o ciclo vicioso entre problemas de sono e problemas de saúde mental" />

    <h2 className="mt-8 mb-4 text-2xl font-semibold text-neutral-dark">Dicas para Melhorar a Higiene do Sono</h2>
    <p>Adotar bons hábitos de sono (higiene do sono) pode melhorar a qualidade do seu descanso:</p>
    <ul className="space-y-3 list-disc list-outside ml-5 marker:text-primary">
      <li><strong>Mantenha um horário regular:</strong> Tente ir para a cama e acordar por volta do mesmo horário todos os dias, mesmo nos fins de semana.</li>
      <li><strong>Crie um ambiente propício ao sono:</strong> Seu quarto deve ser escuro, silencioso e fresco.</li>
      <li>
        <strong>Desenvolva uma rotina relaxante antes de dormir:</strong> Leia um livro, tome um banho morno ou ouça música calma. Evite telas (celular, TV, computador) pelo menos uma hora antes de deitar.
        <ImagePlaceholder text="Ícones representando atividades relaxantes antes de dormir (livro, banho, lua)" />
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

// --- Main Router ---
function Pages() {
  return (
    <Layout>
      <Suspense fallback={<div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>}>
        <Routes>
          {/* Rotas existentes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/autoavaliacao" element={<AssessmentPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/recursos" element={<ResourcesPage />} /> {/* Página principal de Recursos */}
          <Route path="/privacidade" element={<PrivacyPolicyPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* *** NOVAS ROTAS PARA ARTIGOS E GUIAS *** */}
          <Route path="/recursos/artigo/entendendo-ansiedade" element={<ArtigoEntendendoAnsiedadePage />} />
          <Route path="/recursos/artigo/estrategias-baixo-humor" element={<ArtigoEstrategiasBaixoHumorPage />} />
          <Route path="/recursos/guia/meditacao-mindfulness" element={<GuiaMindfulnessPage />} />
          <Route path="/recursos/artigo/importancia-sono" element={<ArtigoImportanciaSonoPage />} />
          {/* Adicione rotas para outros artigos/guias aqui se necessário */}


          {/* Rotas Protegidas existentes */}
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

          {/* Catch-all para 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}

export default Pages;
