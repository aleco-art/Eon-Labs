import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { HomePage } from "./pages/HomePage";
import { ShowroomPage } from "./pages/ShowroomPage";
import { ProjectDetailPage } from "./pages/ProjectDetailPage";
import { NotFoundPage, PackagesPage, ProcessPage, SolutionsPage } from "./pages/ContentPages";
import { IntakePage } from "./pages/IntakePage";

export function App() {
  return <Routes><Route element={<Layout/>}><Route index element={<HomePage/>}/><Route path="showroom" element={<ShowroomPage/>}/><Route path="showroom/:slug" element={<ProjectDetailPage/>}/><Route path="soluciones" element={<SolutionsPage/>}/><Route path="como-trabajamos" element={<ProcessPage/>}/><Route path="paquetes" element={<PackagesPage/>}/><Route path="empezar" element={<IntakePage/>}/><Route path="404" element={<NotFoundPage/>}/><Route path="*" element={<Navigate to="/404" replace/>}/></Route></Routes>;
}
