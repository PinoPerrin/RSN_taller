import React, { useState } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import {
  Sliders,
  BookOpen,
  HelpCircle,
  FileText,
  Sigma,
  Network,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Layers,
  Sparkles,
} from 'lucide-react';

export const MethodologyPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'matrix' | 'formulas' | 'decisions' | 'pathfinder_guide' | 'references'>('matrix');

  const indicators = [
    {
      name: 'Valor J (Total de Definidoras)',
      tradition: 'RSN Clásica',
      author: 'Figueroa et al. (1981); Valdez Medina (1998)',
      formula: 'J = |V_s|',
      definition: 'Cardinalidad del conjunto de palabras definidoras distintas producidas por la muestra.',
      interpretation: 'Riqueza semántica y variabilidad léxica en torno al estímulo.',
    },
    {
      name: 'Valor M (Peso Semántico / PS)',
      tradition: 'RSN Clásica y Modificada',
      author: 'Figueroa et al. (1981); Reyes-Lagunes (1993)',
      formula: 'M(w) = \\sum_{i=1}^N VS(r_{i,w})',
      definition: 'Suma de los pesos jerárquicos asignados a la palabra por todos los participantes.',
      interpretation: 'Importancia o centralidad de la palabra para definir el concepto estímulo.',
    },
    {
      name: 'Ponderación Canónica VS(r)',
      tradition: 'RSN Clásica',
      author: 'Figueroa et al. (1981)',
      formula: 'VS(r) = 11 - r, \\quad r \\in \\{1, \\dots, 10\\}',
      definition: 'Asigna 10 puntos al rango 1, 9 al rango 2, ..., 1 al rango 10.',
      interpretation: 'Regla canónica de ponderación inversa para jerarquías.',
    },
    {
      name: 'Distancia Semántica Cuantitativa (FMG)',
      tradition: 'RSN Clásica',
      author: 'Figueroa et al. (1981); Valdez Medina (1998)',
      formula: 'FMG(w) = \\frac{M(w)}{\\max_{v} M(v)} \\times 100',
      definition: 'Porcentaje de peso semántico relativo a la definidora de mayor peso.',
      interpretation: 'Distancia conceptual de cada palabra respecto al núcleo central (100%).',
    },
    {
      name: 'Conjunto SAM (Significado Acomodado a la Memoria)',
      tradition: 'RSN Clásica',
      author: 'Figueroa et al. (1981)',
      formula: 'SAM = \\{w_{(1)}, w_{(2)}, \\dots, w_{(k)}\\}, \\quad k \\in \\{10, 15\\}',
      definition: 'Las primeras k palabras ordenadas descendentemente por Valor M.',
      interpretation: 'Límite empírico de capacidad de memoria operativa para resumir el significado.',
    },
    {
      name: 'Núcleo de la Red (Corte Scree Test)',
      tradition: 'RSN Modificada / Validación',
      author: 'Cattell (1966); Reyes-Lagunes (1993); Zermeño et al. (2005)',
      formula: 'NR = \\{w_1, \\dots, w_k \\mid \\Delta M_k > \\tau \\cdot \\bar{\\Delta}_{tail}\\}',
      definition: 'Subconjunto de palabras previas al punto de inflexión asintótico en la curva de sedimentación.',
      interpretation: 'Componentes esenciales e invariantes del significado colectivo, superando la cuota arbitraria de 10.',
    },
    {
      name: 'Índice de Consenso Grupal (ICG / S)',
      tradition: 'RSN Comparativa',
      author: 'Valdez Medina (1998); Vera-Noriega (2005)',
      formula: 'ICG = \\frac{|SAM_A \\cap SAM_B|}{|SAM_A \\cup SAM_B|} \\times 100',
      definition: 'Similitud de Jaccard expresada como porcentaje entre los conjuntos nucleares de dos redes.',
      interpretation: 'Grado de acuerdo o solapamiento conceptual entre dos grupos o culturas.',
    },
    {
      name: 'Matriz de Coocurrencia C(u, v)',
      tradition: 'Enfoque Moderno de Grafos',
      author: 'De Deyne et al. (2013); Siew et al. (2019)',
      formula: 'C(u, v) = \\sum_{i=1}^N \\mathbb{I}(u \\in R_i) \\mathbb{I}(v \\in R_i)',
      definition: 'Número de participantes que mencionaron simultáneamente las palabras u y v.',
      interpretation: 'Fuerza del enlace asociativo no dirigido en el espacio semántico.',
    },
    {
      name: 'Coeficiente de Agrupamiento (CC)',
      tradition: 'Teoría de Redes Complejas',
      author: 'Watts & Strogatz (1998); Christensen & Kenett (2021)',
      formula: 'C_i = 2 e_i / [k_i(k_i - 1)],  CC = (1/V) ∑ C_i',
      definition: 'Probabilidad de que dos vecinos de un nodo estén interconectados entre sí.',
      interpretation: 'Modularidad local y transitividad triádica del léxico mental.',
    },
    {
      name: 'Modularidad Q (Algoritmo de Louvain)',
      tradition: 'Detección de Comunidades',
      author: 'Blondel et al. (2008); Newman (2006)',
      formula: 'Q = (1/2m) ∑ [A_ij - (k_i k_j / 2m)] δ(c_i, c_j)',
      definition: 'Medida de la calidad de la partición de la red en comunidades densas.',
      interpretation: 'Identifica subdominios temáticos o facetas semánticas del concepto.',
    },
    {
      name: 'Pesos de Asociación de Rumelhart (w_ij)',
      tradition: 'Tradición Mexicana • SemNet / Conexionismo',
      author: 'Rumelhart et al. (1986); Sánchez, De la Garza & López (2013)',
      formula: 'w_ij = ln[ (P_11 · P_00) / (P_10 · P_01) ]',
      definition: 'Log-Odds Ratio de coocurrencia probabilística entre conceptos en listas de definidoras.',
      interpretation: 'Fuerza excitatoria (w > 0) o inhibitoria (w < 0) entre conceptos en la memoria semántica.',
    },
    {
      name: 'Red Asociativa Pathfinder (PFNET)',
      tradition: 'Escalamiento de Redes de Conocimiento',
      author: 'Schvaneveldt, Durso & Mukherji (1982); Schvaneveldt (1990)',
      formula: 'L = [ ∑ d_i^r ]^(1/r),  d_ij = 1 / w_ij',
      definition: 'Filtra aristas redundantes si existe una ruta alternativa de longitud ≤ q con menor distancia Minkowski.',
      interpretation: 'Estructura mínima no redundante que preserva las trayectorias asociativas fundamentales.',
    },
    {
      name: 'Índice de Similaridad Estructural (ISE)',
      tradition: 'Tradición Mexicana • SemNet',
      author: 'Sánchez, De la Garza & López (2013)',
      formula: 'ISE = |E_A ∩ E_B| / |E_A ∪ E_B|',
      definition: 'Razón de conexiones comunes sobre el total de conexiones posibles entre dos redes Pathfinder.',
      interpretation: 'Grado cuantitativo de acuerdo estructural y microestructuras compartidas entre grupos.',
    },
  ];

  const references = [
    {
      author: 'Figueroa, J. G., González, E. G., & Solís, V. M. (1981)',
      title: 'Una aproximación al problema del significado: Las redes semánticas naturales',
      journal: 'Revista Latinoamericana de Psicología, 13(3), 447-458',
      desc: 'Artículo fundacional que establece los conceptos de Valor J, Valor M, Valor FMG, Conjunto SAM y la regla de ponderación 11-r.',
    },
    {
      author: 'Reyes-Lagunes, I. (1993)',
      title: 'Las redes semánticas naturales, su conceptualización y utilización en la construcción de instrumentos psicológicos',
      journal: 'Revista de Psicología Social y Personalidad, 9(1), 81-97',
      desc: 'Introduce la técnica modificada de RSN, reduciendo sesgos y fundamentando el uso de criterios de corte de varianza.',
    },
    {
      author: 'Sánchez Miranda, M. P., De la Garza González, A., & López Ramírez, E. O. (2013)',
      title: 'Simulaciones computacionales sobre cuestiones ambientales en dos grupos de contraste',
      journal: 'Liberabit: Revista Peruana de Psicología, 19(2), 223-233',
      desc: 'Implementa el modelo probabilístico conexionista de Rumelhart con redes Pathfinder (PFNET) e introduce el Índice de Similaridad Estructural (ISE) en RSN.',
    },
    {
      author: 'Sánchez Miranda, M. P., & De la Garza González, A. (2014)',
      title: 'SemNet: Programa para la obtención y análisis de Redes Semánticas Naturales (Manual de Usuario v3.22)',
      journal: 'Universidad Autónoma de Nuevo León (UANL)',
      desc: 'Manual de usuario del software mexicano SemNet; documenta los módulos de análisis SAM, Esquemata conexionista y redes Pathfinder.',
    },
    {
      author: 'Schvaneveldt, R. W., Durso, F. T., & Mukherji, B. R. (1982)',
      title: 'Semantic distance effects in categorization tasks',
      journal: 'Journal of Experimental Psychology: Learning, Memory, and Cognition, 8(1), 1-15',
      desc: 'Introducción del algoritmo Pathfinder (PFNET) para modelar distancias en memoria semántica y estructuras de conocimiento.',
    },
    {
      author: 'Rumelhart, D. E., Smolensky, P., McClelland, J. L., & Hinton, G. E. (1986)',
      title: 'Schemata and sequential thought processes',
      journal: 'En McClelland & Rumelhart (Eds.), Parallel Distributed Processing: Explorations in the Microstructure of Cognition (Vol. 2, pp. 7-57). MIT Press',
      desc: 'Formalización del modelo de activación probabilística de esquemas y pesos asociativos mediante log-odds ratio de coocurrencia.',
    },
    {
      author: 'Valdez Medina, J. L. (1998)',
      title: 'Las redes semánticas naturales: Usos y aplicaciones en psicología social',
      journal: 'Universidad Autónoma del Estado de México (UAEM)',
      desc: 'Monografía clásica sobre las aplicaciones psicosociales, definición de Valor G e índices de correlación semántica.',
    },
    {
      author: 'Vera-Noriega, J. A., Pimentel, C. E., & Batista de Albuquerque, F. J. (2005)',
      title: 'Redes semánticas: Aspectos teóricos, técnicos, metodológicos y analíticos',
      journal: 'Ra Ximhai, 1(3), 439-451',
      desc: 'Revisión metodológica que compara las tradiciones mexicana y brasileña, y formaliza el cálculo del consenso intergrupal.',
    },
    {
      author: 'Siew, C. S., Wulff, D. U., Beckage, N. M., & Kenett, Y. N. (2019)',
      title: 'Cognitive network science: A review of research on cognition through the lens of network representations, processes, and dynamics',
      journal: 'Complexity, 2019, 1-24. https://doi.org/10.1155/2019/2108423',
      desc: 'Revisión exhaustiva contemporánea sobre la ciencia de redes cognitivas, topología, métricas de grafos y teoría de búsqueda semántica.',
    },
    {
      author: 'Christensen, A. P., & Kenett, Y. N. (2021)',
      title: 'Semantic network analysis (SemNeT): An R package for estimating, visualizing, and analyzing semantic networks',
      journal: 'Behavior Research Methods, 53(5), 2163-2182',
      desc: 'Estándar metodológico computacional para el filtrado de aristas, cálculo de ASPL, clustering coefficient y comparación de redes cognitivas.',
    },
    {
      author: 'De Deyne, S., Navarro, D. J., & Storms, G. (2013)',
      title: 'Better together: Combining language models and semantic networks',
      journal: 'Frontiers in Psychology, 4, 858',
      desc: 'Fundamenta la asociación de palabras continua como grafo libre de escala y demuestra la superioridad de la matriz de coocurrencia.',
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Sliders className="w-6 h-6 text-primary-600" />
            Metodología y Fundamentación Científica
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Documentación matemática formal, fuentes bibliográficas en APA 7 y decisiones de diseño metodológico.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
          <button
            onClick={() => setActiveTab('matrix')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              activeTab === 'matrix'
                ? 'bg-primary-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Matriz de Indicadores
          </button>
          <button
            onClick={() => setActiveTab('formulas')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              activeTab === 'formulas'
                ? 'bg-primary-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Especificaciones Matemáticas
          </button>
          <button
            onClick={() => setActiveTab('decisions')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              activeTab === 'decisions'
                ? 'bg-primary-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Decisiones Metodológicas
          </button>
          <button
            onClick={() => setActiveTab('pathfinder_guide')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              activeTab === 'pathfinder_guide'
                ? 'bg-primary-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Redes Pathfinder (Capítulo SemNet)
          </button>
          <button
            onClick={() => setActiveTab('references')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              activeTab === 'references'
                ? 'bg-primary-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Referencias (APA 7)
          </button>
        </div>

        {/* Content Tabs */}
        {activeTab === 'matrix' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {indicators.map((ind, i) => (
                <div
                  key={i}
                  className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2 hover:border-slate-300 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center font-bold text-xs">
                        {i + 1}
                      </span>
                      <h3 className="text-base font-black text-slate-900 tracking-tight">
                        {ind.name}
                      </h3>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider w-fit">
                      {ind.tradition}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 font-mono text-xs text-primary-900 font-bold overflow-x-auto">
                    {ind.formula}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
                    <div>
                      <strong className="text-slate-800">Definición Operacional:</strong> {ind.definition}
                    </div>
                    <div>
                      <strong className="text-slate-800">Interpretación:</strong> {ind.interpretation}
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 pt-1">
                    <strong>Fuente:</strong> {ind.author}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'formulas' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-6">
            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                Definiciones Operacionales y Rigor Algorítmico
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Cada uno de los indicadores calculados en la plataforma cuenta con implementación verificada
                mediante pruebas unitarias automatizadas (Vitest) con datasets sintéticos controlados.
              </p>
            </div>

            <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <h4 className="font-black text-sm text-slate-900">
                  1. Regla Canónica de Ponderación (Figueroa et al., 1981)
                </h4>
                <p>
                  Dada una respuesta de un participante con jerarquías {'r ∈ {1, 2, ..., m}'} (donde m ≤ 10):
                </p>
                <div className="p-3 bg-white rounded-xl border border-slate-200 font-mono font-bold text-primary-700">
                  {'VS(r) = 11 - r'}
                </div>
                <p>
                  Por ejemplo: la palabra asignada con rango 1 recibe 11 - 1 = 10 puntos; el rango 2 recibe 9 puntos;
                  el rango 10 recibe 1 punto.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <h4 className="font-black text-sm text-slate-900">
                  2. Distancia Semántica Cuantitativa (FMG %)
                </h4>
                <p>
                  Para normalizar las diferencias en el tamaño de muestra y comparar estímulos de distinta riqueza:
                </p>
                <div className="p-3 bg-white rounded-xl border border-slate-200 font-mono font-bold text-primary-700">
                  {'FMG(w) = [M(w) / max M(v)] × 100'}
                </div>
                <p>
                  La definidora con mayor Valor M define el 100% de la distancia semántica. Todas las demás se expresan
                  como una proporción cuantitativa respecto a ella.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <h4 className="font-black text-sm text-slate-900">
                  3. Identificación del Núcleo de la Red (Scree Test de Cattell)
                </h4>
                <p>
                  A diferencia de la cuota fija arbitraria de 10 palabras (SAM), la determinación objetiva del Núcleo
                  de la Red (NR) analiza la primera diferencia de los pesos semánticos consecutivos:
                </p>
                <div className="p-3 bg-white rounded-xl border border-slate-200 font-mono font-bold text-primary-700">
                  {'ΔM_i = M_(i) - M_(i+1)'}
                </div>
                <p>
                  El algoritmo identifica el punto de codo donde ΔM_k experimenta la mayor caída relativa
                  superando el doble de la pendiente promedio de la asíntota de la cola.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <h4 className="font-black text-sm text-slate-900">
                  4. Proyección No Dirigida de Coocurrencia en Grafos
                </h4>
                <p>
                  Para modelar la red cognitiva como grafo complejo (Siew et al., 2019):
                </p>
                <div className="p-3 bg-white rounded-xl border border-slate-200 font-mono font-bold text-primary-700">
                  {'W_uv = ∑ 1(u ∈ Lista_p ∧ v ∈ Lista_p)'}
                </div>
                <p>
                  Sobre esta matriz se calculan el coeficiente de agrupamiento de Watts-Strogatz, la longitud promedio
                  de caminos más cortos (Dijkstra) y las comunidades temáticas de Louvain.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'decisions' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-5">
            <h3 className="text-lg font-black text-slate-900 tracking-tight">
              Resolución de Controversias Metodológicas
            </h3>

            <div className="space-y-4 text-xs text-slate-700">
              <div className="border-l-4 border-primary-500 pl-4 py-1 space-y-1">
                <h4 className="font-bold text-slate-900 text-sm">
                  1. Listas cortas de palabras asociadas
                </h4>
                <p>
                  <strong>Dilema:</strong> Cuando un participante produce menos de 10 palabras (por ejemplo 4),
                  ¿deben los rangos 1, 2, 3, 4 recibir pesos 10, 9, 8, 7 o ajustarse proporcionalmente?
                </p>
                <p className="text-slate-500">
                  <strong>Decisión en la plataforma:</strong> Se implementa de forma predeterminada la regla canónica
                  {'11 - r'} (Figueroa et al., 1981), pero se ofrece como opción configurable a nivel de proyecto la
                  regla proporcional de Valdez Medina (1998): {'VS(r) = [(m + 1 - r) / m] × 10'}.
                </p>
              </div>

              <div className="border-l-4 border-primary-500 pl-4 py-1 space-y-1">
                <h4 className="font-bold text-slate-900 text-sm">
                  2. Separación de Topologías de Red
                </h4>
                <p>
                  <strong>Dilema:</strong> En la literatura tradicional, a menudo se dibuja un "grafo estrella" con el estímulo
                  al centro y las palabras alrededor. Sin embargo, calcular el coeficiente de agrupamiento sobre un grafo estrella
                  produce trivialmente $CC = 0$.
                </p>
                <p className="text-slate-500">
                  <strong>Decisión en la plataforma:</strong> Se mantienen estrictamente dos vistas diferenciadas: la estrella
                  egocéntrica tradicional (definidoras respecto al estímulo) y el grafo cognitivo moderno no dirigido basado en
                  coocurrencias empíricas entre definidoras.
                </p>
              </div>

              <div className="border-l-4 border-primary-500 pl-4 py-1 space-y-1">
                <h4 className="font-bold text-slate-900 text-sm">
                  3. Tratamiento No Destructivo de Sinónimos y Lematización
                </h4>
                <p>
                  <strong>Dilema:</strong> La agrupación apresurada de palabras aparentemente sinónimas puede borrar matices
                  psicológicos cruciales.
                </p>
                <p className="text-slate-500">
                  <strong>Decisión en la plataforma:</strong> Las respuestas crudas escritas por los participantes jamás se
                  modifican ni sobrescriben. Toda regla de normalización es una capa declarativa con autor, justificación y fecha,
                  la cual puede activarse o desactivarse en tiempo real.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'pathfinder_guide' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-6">
            <div className="space-y-2 pb-4 border-b border-slate-100">
              <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black uppercase tracking-wider">
                Capítulo Didáctico • Tradición Mexicana y SemNet
              </span>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                Simulación Conexionista y Redes Pathfinder (PFNET)
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Fundamentos matemáticos y cognitivos de la integración entre las Redes Semánticas Naturales,
                el modelo asociativo conexionista de Rumelhart y el escalamiento de redes de conocimiento de Schvaneveldt.
              </p>
            </div>

            <div className="space-y-6 text-xs text-slate-700 leading-relaxed">
              {/* 1. Qué es el modelo conexionista */}
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                <h4 className="font-black text-sm text-slate-900">
                  1. ¿Qué es el modelo de asociación probabilística basado en Rumelhart?
                </h4>
                <p>
                  En la psicología cognitiva tradicional, las categorías se concebían como almacenes jerárquicos rígidos.
                  En contraste, el modelo de <strong>Procesamiento Distribuido en Paralelo (PDP)</strong> de Rumelhart,
                  Smolensky, McClelland y Hinton (1986; McClelland & Rumelhart, 1999) plantea que el conocimiento no
                  está localizado en un único nodo, sino distribuido en <em>microestructuras semánticas</em>.
                </p>
                <p>
                  Un concepto o esquema mental (por ejemplo, el esquema ambiental de "ecología" o "contaminación")
                  emerge de la activación cooperativa y simultánea de múltiples conceptos elementales. Para modelar
                  esta activación, cada palabra se representa como una variable binaria: presente (1) o ausente (0)
                  en la memoria de trabajo del participante durante la tarea de asociación libre.
                </p>
              </div>

              {/* 2. Cómo se obtiene la matriz */}
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                <h4 className="font-black text-sm text-slate-900">
                  2. ¿Cómo se obtiene la matriz de asociaciones probabilísticas?
                </h4>
                <p>
                  A partir de las respuestas producidas por la muestra de participantes, se construye para cada par de
                  conceptos (x_i, x_j) una tabla de contingencia 2 × 2:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono text-[11px]">
                  <div className="p-2 bg-white rounded-xl border border-slate-200">
                    <span className="font-black text-primary-700 block">P_11</span>
                    <span className="text-slate-500 text-[10px]">Aparición conjunta</span>
                  </div>
                  <div className="p-2 bg-white rounded-xl border border-slate-200">
                    <span className="font-black text-primary-700 block">P_10</span>
                    <span className="text-slate-500 text-[10px]">Presente en x_i, ausente en x_j</span>
                  </div>
                  <div className="p-2 bg-white rounded-xl border border-slate-200">
                    <span className="font-black text-primary-700 block">P_01</span>
                    <span className="text-slate-500 text-[10px]">Ausente en x_i, presente en x_j</span>
                  </div>
                  <div className="p-2 bg-white rounded-xl border border-slate-200">
                    <span className="font-black text-primary-700 block">P_00</span>
                    <span className="text-slate-500 text-[10px]">Ausente en ambos</span>
                  </div>
                </div>
                <p>
                  El peso de asociación conexionista w_ij entre dos palabras se calcula mediante la ecuación
                  de Sánchez Miranda, De la Garza y López Ramírez (2013, p. 224):
                </p>
                <div className="p-3 bg-white rounded-xl border border-slate-200 font-mono font-bold text-primary-700 text-center">
                  {'w_ij = ln[ (P_11 · P_00) / (P_10 · P_01) ]'}
                </div>
                <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 text-amber-900 space-y-1">
                  <strong>Ejemplo numérico didáctico:</strong>
                  <p>
                    Supongamos que en una muestra de 100 participantes, los conceptos <em>BOSQUE</em> y <em>ÁRBOLES</em>
                    coocurren en 40 listas (P_11 = 0.40), 10 mencionan solo bosque (P_10 = 0.10), 10 solo árboles (P_01 = 0.10)
                    y 40 ninguno (P_00 = 0.40).
                  </p>
                  <p className="font-mono text-[11px]">
                    {'Odds Ratio = (0.40 × 0.40) / (0.10 × 0.10) = 0.16 / 0.01 = 16.0'}
                  </p>
                  <p className="font-mono text-[11px]">
                    {'w_ij = ln(16.0) = 2.77 > 0  (Asociación excitatoria fuerte)'}
                  </p>
                </div>
              </div>

              {/* 3. Transformación a distancias */}
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                <h4 className="font-black text-sm text-slate-900">
                  3. ¿Qué significa transformar asociaciones en distancias?
                </h4>
                <p>
                  En los modelos conexionistas, un peso alto w_ij indica que un concepto excita vivamente al otro.
                  Sin embargo, los algoritmos de escalamiento geométrico como Pathfinder requieren una medida de
                  <strong> distancia disimilar</strong> d_ij, donde valores pequeños indican cercanía y valores grandes
                  indican lejanía conceptual.
                </p>
                <p>
                  Siguiendo a Sánchez et al. (2013, p. 227), la conversión se realiza mediante el recíproco:
                </p>
                <div className="p-3 bg-white rounded-xl border border-slate-200 font-mono font-bold text-primary-700 text-center">
                  {'d_ij = 1 / w_ij   (para w_ij > 0)'}
                </div>
                <p>
                  <strong>Resolución rigurosa de casos límite:</strong> Cuando dos conceptos son independientes (w_ij = 0)
                  o tienen asociación inhibitoria / negativa (w_ij &lt; 0), no existe vínculo excitatorio en el esquema.
                  Asignar valores negativos violaría los axiomas métricos de Minkowski. Por tanto, la plataforma asigna
                  rigurosamente {'d_ij = ∞'}, impidiendo que se creen enlaces falsos.
                </p>
              </div>

              {/* 4. Cómo funciona Pathfinder */}
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                <h4 className="font-black text-sm text-slate-900">
                  4. ¿Cómo funciona el algoritmo Pathfinder?
                </h4>
                <p>
                  El algoritmo de Redes Asociativas Pathfinder (Schvaneveldt, Durso & Mukherji, 1982; Schvaneveldt, 1990)
                  toma la matriz completa de distancias y somete a prueba cada arista directa entre dos palabras (i, j).
                </p>
                <p>
                  Si existe un camino alternativo indirecto (por ejemplo: i → k → j) compuesto por hasta <em>q</em> pasos cuya
                  distancia Minkowski combinada sea menor o igual a la distancia directa (L ≤ d_ij), la conexión directa
                  es considerada <strong>redundante</strong> y es eliminada de la red.
                </p>
                <p>
                  El resultado es la red asociativa más económica (PFNET), que retiene únicamente las trayectorias de
                  menor resistencia semántica.
                </p>
              </div>

              {/* 5. Parámetros r y q */}
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                <h4 className="font-black text-sm text-slate-900">
                  5. ¿Qué representan los parámetros r y q?
                </h4>
                <div className="space-y-2">
                  <p>
                    <strong>Parámetro r (Métrica de Minkowski):</strong> Determina cómo se acumulan las distancias a lo largo de un camino:
                  </p>
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200 font-mono text-[11px] font-bold text-center">
                    {'L = [ ∑ d_i^r ]^(1/r)'}
                  </div>
                  <ul className="list-disc pl-5 space-y-1 text-slate-600">
                    <li>{'r = 1: Métrica Manhattan (suma aritmética simple de las distancias).'}</li>
                    <li>{'r = 2: Métrica Euclídea ordinaria.'}</li>
                    <li>{'r = ∞: Métrica de Chebyshev (la longitud del camino está determinada por la distancia máxima de sus enlaces, es decir, el eslabón más débil o cuello de botella).'}</li>
                  </ul>
                  <p>
                    <strong>Parámetro q (Límite de enlaces alternativos):</strong> Es el número máximo de aristas que se permite explorar en caminos indirectos.
                    Con q = 1, ninguna alternativa se evalúa y la red queda completa. Con {'q = V - 1'}, se consideran todos los caminos posibles,
                    produciendo la red más depurada: <strong>{'PFNET(∞, V-1)'}</strong>.
                  </p>
                </div>
              </div>

              {/* 6. Cómo se interpreta la imagen */}
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                <h4 className="font-black text-sm text-slate-900">
                  6. ¿Cómo se interpreta la imagen de la red obtenida?
                </h4>
                <p>
                  En la visualización (semejante a la pantalla de Pathfinder del programa SemNet, p. 23):
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-600">
                  <li>Cada caja representa un concepto definidor.</li>
                  <li>El número junto al nombre (ej. <strong>{'[12]'}</strong>) indica el grado de conexiones conservadas.</li>
                  <li>Los conceptos con mayor número de conexiones son los <em>hubs semánticos</em> u organizadores centrales del significado grupal.</li>
                  <li>Al hacer clic sobre uno o varios conceptos, estos se destacan en color rojo y activan sus enlaces directos, atenuando el resto.</li>
                  <li><strong>Aviso de rigor:</strong> La posición de los nodos en la pantalla es un ordenamiento estético generado por un algoritmo de fuerzas para evitar cruces; no debe interpretarse como una distancia psicológica euclidiana en centímetros (Schvaneveldt, 1990).</li>
                </ul>
              </div>

              {/* 7. Conexiones directas e indirectas */}
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                <h4 className="font-black text-sm text-slate-900">
                  7. ¿Qué representa una conexión directa o indirecta?
                </h4>
                <p>
                  <strong>Conexión directa:</strong> Refleja una proximidad semántica tan estrecha que ninguna otra combinación
                  de conceptos puede sustituirla. Constituye el núcleo atómico del significado.
                </p>
                <p>
                  <strong>Conexión indirecta:</strong> Dos palabras que no se conectan directamente pero están enlazadas a través
                  de conceptos puente (ej. en el estudio de biología de Sánchez et al., 2013, <em>ambiente</em> se liga con <em>naturaleza</em>
                  a través del nodo <em>árboles</em>). Revela la arquitectura de las microestructuras conceptuales.
                </p>
              </div>

              {/* 8. Limitaciones metodológicas */}
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                <h4 className="font-black text-sm text-slate-900">
                  8. ¿Qué limitaciones tiene este procedimiento?
                </h4>
                <ul className="list-disc pl-5 space-y-1 text-slate-600">
                  <li><strong>Simetría:</strong> Las matrices de coocurrencia son simétricas (w_ij = w_ji), por lo que no captan asimetrías psicológicas (ej. "el caballo parece una cebra" vs "la cebra parece un caballo").</li>
                  <li><strong>Sensibilidad a ceros:</strong> En muestras pequeñas, celdas de contingencia con valor cero producirían indeterminaciones matemáticas, lo que requiere aplicar suavizado bayesiano de Haldane-Anscombe.</li>
                  <li><strong>Un solo estímulo vs. Múltiples estímulos:</strong> En el estudio original de Sánchez et al. (2013), se combinaron los conjuntos SAM de 7 estímulos temáticos. Si se analiza un solo estímulo, la matriz se basa en coocurrencias intragrupo a nivel de participante, lo cual constituye una adaptación metodológica documentada y no una reproducción idéntica.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'references' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-black text-slate-900 tracking-tight">
              Referencias Bibliográficas (Formato APA 7)
            </h3>

            <div className="divide-y divide-slate-100">
              {references.map((ref, idx) => (
                <div key={idx} className="py-4 space-y-1 text-xs">
                  <p className="font-bold text-slate-900">{ref.author}</p>
                  <p className="italic text-slate-800">{ref.title}</p>
                  <p className="text-slate-600">{ref.journal}</p>
                  <p className="text-[11px] text-slate-400 pt-0.5">{ref.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
