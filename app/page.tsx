
export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-black text-white font-sans dark:bg-black">
      <img src="FPMX-logo.png" alt="Cronoka Logo" className="w-48 h-48 mb-8" />
      <h1 className="text-4xl font-bold text-white justify-center text-center dark:text-gray-200">
        Bem Vindo ao Cronoka!<br/> Faça login para acessar o dashboard.
      </h1>
      <button className="bg-white text-black px-4 py-2  rounded mt-4 hover:bg-gray-500 transition duration-300">
        <a href="/login">Ir para Login</a>
      </button>
    </div>
  );
}
