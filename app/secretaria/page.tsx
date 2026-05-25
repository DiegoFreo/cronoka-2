import { Card, CardContent } from "@/app/components/card";
import { UserPen, Users, Layers, Flag } from "lucide-react";

export default function SecretariaPage() {

  const countUsuario = 0;
  return (
    <div className="flex flex-row flex-wrap gap-4 items-center justify-center font-sans dark:bg-black">
       <Card className="w-45 p-2 mt-4 border  border-red-600 cursor-pointer" >
            <CardContent className="flex flex-col items-center justify-center" >              
              <Users className="w-10 h-10 mb-2 mt-2 font-bold" />
              <h2 className="text-2xl font-bold text-center mb-4">Competidores</h2>
              <p className="font-color-red">Total - {countUsuario}</p>
            </CardContent>
        </Card>
        <Card className="w-45 p-2 mt-4 border  border-red-600 cursor-pointer" >
            <CardContent className="flex flex-col items-center justify-center" >              
              <Layers className="w-10 h-10 mb-2 mt-2 font-bold" />
              <h2 className="text-2xl font-bold text-center mb-4">Categorias</h2>
              <p className="font-color-red">Total - {countUsuario}</p>
            </CardContent>
        </Card>
        <Card className="w-45 p-2 mt-4 border  border-red-600 cursor-pointer" >
            <CardContent className="flex flex-col items-center justify-center" >              
              <Flag className="w-10 h-10 mb-2 mt-2 font-bold" />
              <h2 className="text-2xl font-bold text-center mb-4">Baterias</h2>
              <p className="font-color-red">Total - {countUsuario}</p>
            </CardContent>
        </Card>
        <Card className="w-45 p-2 mt-4 border  border-red-600 cursor-pointer" >
            <CardContent className="flex flex-col items-center justify-center" >              
              <Flag className="w-10 h-10 mb-2 mt-2 font-bold" />
              <h2 className="text-2xl font-bold text-center mb-4">Chips</h2>
              <p className="font-color-red">Restante - {countUsuario}</p>
            </CardContent>
        </Card>
      
    </div>
  );
}