'use client'
import { useState } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Usuario } from '@/app/types/types-corrida';
import { useRouter } from 'next/navigation';

// 1. Definimos o esquema de validação usando Zod
const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
});

//Tipagem baseada no esquema
type LoginFormData = z.infer<typeof loginSchema>;


// 3. Criamos o componente de formulário de login
export function LoginForm() {


// 2. Inicializamos o formulário com React Hook Form e o resolver do Zod
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 3. Função de submissão do formulário
  const onSubmit = async (data: z.infer<typeof loginSchema>) => {
    setLoading(true);
    setError(null);
   
    const result = await signIn('credentials', {
      emailUser: data.email,
      passworUser: data.password,
      redirect: false, // Redireciona automaticamente após o login
    });


    if (result?.error) {
        setError("Email ou senha inválidos.");
        setLoading(false);
    } else {
      if (result?.ok) {
        // 2. Buscamos a sessão atualizada que acabou de ser criada
        const session = await getSession().catch((err) => {
          console.error('Error fetching session:', err);
          return null;
        }) as Usuario | null;
        const nivelUser = session?.nivelUser;

        console.log('Login bem-sucedido. Nível do usuário:', nivelUser);
        // 3. Redirecionamento baseado no nível (Role)
      if (nivelUser === 'A') {
        router.push('/admin');
      } else if (nivelUser === 'S') {
        router.push('/secretaria');
      } else if (nivelUser === 'C') {
        router.push('/cronometragem');
      } else {
        router.push('/'); // Rota padrão caso não tenha nível definido
      }

      router.refresh();
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white gap-4">        
      <div className="w-full max-w-md p-8 bg-gray-800 rounded shadow">
        <div className="flex flex-col items-center mb-6">
          <img src="FPMX-logo.png" alt="Cronoka Logo" className="w-48 h-48 mb-8" />
          <h2 className="text-2xl font-bold mb-6">Login Cronoka</h2>
        </div>
    <form onSubmit={handleSubmit(onSubmit)} >
      <div className="flex flex-col gap-2">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          placeholder='exemplo@cronoka.com'
          {...register('email')}
          className='border border-gray-300 rounded px-3 py-2 text-black bg-white'
        />
        {errors.email && <p>{errors.email.message}</p>}
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          placeholder='Senha de usuário'
          {...register('password')}
          className='border border-gray-300 rounded px-3 py-2 text-black bg-white'
        />
        {errors.password && <p>{errors.password.message}</p>}
      </div>
      <button type="submit" disabled={loading} className='bg-white text-black px-4 py-2 w-full rounded mt-4 hover:bg-gray-500 transition duration-300'>
        {loading ? 'Logging in...' : 'Login'}
      </button>
      {error && <p>{error}</p>}
    </form>
      </div>
    </div>
  );
}
