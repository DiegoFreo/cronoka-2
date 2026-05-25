'use client';
import React from "react";

const voltarLogin = () => {
    window.location.href = '/login';
}

export default function AuthErrorPage() {

  return (
    <div className="flex flex-col flex-1 items-center bg-black text-white justify-center font-sans dark:bg-black">
        <h1 className="text-4xl font-bold text-white dark:text-gray-200">
            Erro na Autenticação
        </h1>
        <p className="text-white dark:text-gray-400 mt-4">
            Houve um erro durante a autenticação. Por favor, tente novamente.
        </p>
        <button
            className="mt-6 px-4 py-2 bg-white text-black rounded hover:bg-blue-200 transition duration-300"
            onClick={voltarLogin}
        >
            Voltar para Login
        </button>
    </div>
  );
}