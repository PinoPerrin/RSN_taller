import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { UserLayout } from '../../components/layout/UserLayout';
import {
  BookOpen,
  Search,
  ChevronRight,
  Calculator,
  Compass,
  Network,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  Layers,
  ArrowLeft,
  FileSpreadsheet,
} from 'lucide-react';

interface Chapter {
  id: number;
  title: string;
  summary: string;
  formula?: string;
  content: React.ReactNode;
}

export const UserManualPage: React.FC = () => {
  const [selectedChapterId, setSelectedChapterId] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState('');

  const chapters: Chapter[] = [
    {
      id: 1,
      title: '1. ¿Qué son las Redes Semánticas Naturales?',
      summary: 'Origen, definición y propuesta epistemológica del significado colectivo.',
      content: (
        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          <p>
            Las <strong>Redes Semánticas Naturales (RSN)</strong> son una técnica empírica desarrollada originalmente en México por <strong>Figueroa, González y Solís (1981)</strong> y perfeccionada por <strong>Valdez Medina (1998, 2010)</strong>. Su propósito es capturar de forma cuantitativa y cualitativa la organización interna de la memoria semántica de un grupo humano específico.
          </p>
          <div className="p-3.5 bg-sky-50 border border-sky-200 rounded-xl space-y-1 text-sky-950">
            <p className="font-bold">¿Por qué se llaman «Naturales»?</p>
            <p>
              A diferencia de las redes semánticas artificiales de la inteligencia artificial clásica o las definiciones formales del diccionario, se denominan «naturales» porque las palabras y sus pesos se obtienen directamente de los propios sujetos en su contexto sociocultural nativo, sin imponer categorías prefabricadas por el investigador.
            </p>
          </div>
          <p>
            Esta plataforma digitaliza y estandariza este método, permitiendo que las asociaciones se capturen en tiempo real desde teléfonos celulares y se analicen rigurosamente mediante métricas estadísticas y teoría de redes.
          </p>
        </div>
      ),
    },
    {
      id: 2,
      title: '2. Fundamentos del significado psicológico',
      summary: 'Diferencia entre semántica lingüística formal y significado connotativo.',
      content: (
        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          <p>
            En psicología, el <strong>significado psicológico</strong> no es la mera definición léxica de una palabra, sino una estructura psicológica multidimensional compuesta por:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-slate-600">
            <li><strong>Componente conceptual:</strong> Los rasgos y atributos que describen al objeto o idea.</li>
            <li><strong>Componente afectivo/connotativo:</strong> Las emociones, actitudes y vivencias personales que despierta el concepto.</li>
            <li><strong>Componente conductual:</strong> Los hábitos o patrones de respuesta que la persona asocia con la experiencia.</li>
          </ul>
          <p>
            Cuando múltiples participantes responden a un estímulo, la convergencia de sus palabras revela el <em>núcleo semántico culturalmente compartido</em>.
          </p>
        </div>
      ),
    },
    {
      id: 3,
      title: '3. ¿Qué es un concepto estímulo?',
      summary: 'Criterios para seleccionar las palabras generadoras de la red.',
      content: (
        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          <p>
            El <strong>concepto estímulo</strong> es la palabra o frase breve que se presenta a los participantes para detonar la memoria semántica.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="font-bold text-slate-900 block">Estímulos Simples</span>
              <p className="text-slate-500">Sustantivos o adjetivos nucleares: <em>DOLOR, PAZ, SALUD, MAESTRO</em>.</p>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="font-bold text-slate-900 block">Estímulos Comparativos</span>
              <p className="text-slate-500">Pares contrastantes: <em>DOLOR vs. SUFRIMIENTO</em>, <em>HOMBRE vs. MUJER</em>.</p>
            </div>
          </div>
          <p className="text-slate-500">
            <strong>Recomendación metodológica:</strong> Evita estímulos ambiguos o compuestos muy largos que puedan confundir el foco atencional del participante.
          </p>
        </div>
      ),
    },
    {
      id: 4,
      title: '4. Evocación de palabras definidoras',
      summary: 'Fase de generación libre, temporización y restricciones.',
      content: (
        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          <p>
            En la <strong>Fase de Generación</strong>, el participante observa el estímulo y dispone de un tiempo delimitado (generalmente 60 segundos) para escribir todas las palabras sueltas que le vengan a la mente.
          </p>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-950 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Reglas clásicas de captura</span>
            </p>
            <ul className="list-disc pl-4 space-y-0.5 text-slate-700 text-[11px]">
              <li>Solo palabras sueltas (sustantivos, verbos o adjetivos); no redactar oraciones ni explicaciones.</li>
              <li>No utilizar artículos, preposiciones ni conjunciones (evitar: <em>el, la, de, y</em>).</li>
              <li>El cronómetro garantiza que las respuestas correspondan a la memoria accesible inmediata y no a un razonamiento deliberativo posterior.</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: 5,
      title: '5. Jerarquización de palabras',
      summary: 'Asignación obligatoria de rangos ordinales del 1 al m.',
      content: (
        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          <p>
            Inmediatamente después de generar las palabras, el participante entra a la <strong>Fase de Jerarquización</strong>. Aquí debe ordenar sus propias palabras según el grado de importancia o cercanía que tienen con el estímulo:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-slate-600">
            <li><strong>Rango 1:</strong> La palabra más importante, representativa o directamente ligada al concepto.</li>
            <li><strong>Rango 2:</strong> La segunda en importancia, y así sucesivamente hasta la última palabra generada (rango <em>m</em>).</li>
          </ul>
          <p>
            En la plataforma digital, este proceso se realiza de forma táctil o mediante selección visual directa, garantizando una biyección matemática perfecta (sin empates ni huecos en la numeración).
          </p>
        </div>
      ),
    },
    {
      id: 6,
      title: '6. Normalización y organización de datos',
      summary: 'Lematización y reglas léxicas preservando la base de datos original.',
      content: (
        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          <p>
            En estudios grupales, los participantes escriben variantes de una misma idea (ej. <em>triste, tristeza, tristezas, tristes</em>). La <strong>normalización semántica</strong> permite unificar estas formas en una palabra canónica sin alterar los datos originales.
          </p>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <p className="font-bold text-slate-900">Principio de Reproducibilidad:</p>
            <p className="text-slate-600 text-[11px]">
              La plataforma almacena siempre la forma bruta (<code className="font-mono bg-slate-200 px-1 rounded">rawWord</code>) y la regla de transformación (<code className="font-mono bg-slate-200 px-1 rounded">canonicalWord</code>). Esto permite activar o desactivar la normalización en cualquier momento y recalcular los indicadores.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 7,
      title: '7. Riqueza semántica (Valor J)',
      formula: 'J = Número total de palabras definidoras distintas generadas por el grupo',
      summary: 'Mide la amplitud, diversidad o dispersión del vocabulario asociado al estímulo.',
      content: (
        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          <p>
            El <strong>Valor J</strong> (Riqueza de la Red) corresponde al conteo de palabras diferentes obtenidas tras consolidar a todos los participantes de la muestra.
          </p>
          <div className="p-3.5 bg-slate-100 rounded-xl font-mono text-center text-xs font-bold text-slate-800">
            J = Total de tipos de palabras definidoras distintas
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-600">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="font-bold text-slate-900 block">J Elevado:</span>
              <p>Indica polisemia, dispersión semántica, o que el concepto suscita múltiples facetas o interpretaciones heterogéneas.</p>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="font-bold text-slate-900 block">J Reducido:</span>
              <p>Indica alta concentración o consenso social; el grupo comparte un repertorio léxico compacto y focalizado.</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 8,
      title: '8. Frecuencia y Peso Semántico (Valor M)',
      formula: 'M = Σ [ FA(r) × VS(r) ]   donde   VS(r) = 11 - r (en escala de 10)',
      summary: 'Diferencia crucial entre cuántas veces se menciona una palabra y su peso semántico real.',
      content: (
        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-950 space-y-1">
            <p className="font-bold">¡Distinción Fundamental!</p>
            <p>
              La <strong>Frecuencia de Aparición (FA)</strong> solo cuenta cuántas personas escribieron la palabra. El <strong>Peso Semántico (Valor M)</strong> multiplica cada mención por el valor del rango que se le asignó.
            </p>
          </div>
          <p>
            En el esquema canónico de Valdez Medina (para un máximo de 10 palabras), el <strong>Valor Semántico (VS)</strong> se computa invirtiendo el rango:
          </p>
          <div className="p-3 bg-slate-100 rounded-xl font-mono text-center text-xs font-bold text-slate-800">
            VS(rango 1) = 10 puntos | VS(rango 2) = 9 pts | ... | VS(rango 10) = 1 pt
          </div>
          <p>
            De este modo, una palabra que fue puesta en primer lugar por 5 personas tendrá mucho mayor peso semántico que una palabra puesta en décimo lugar por 10 personas.
          </p>
        </div>
      ),
    },
    {
      id: 9,
      title: '9. Jerarquía media descriptiva',
      formula: 'Media de Rangos = Σ (r × FA_r) / FA_total',
      summary: 'Indica en qué posición promedio tiende a situarse una palabra.',
      content: (
        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          <p>
            La <strong>Jerarquía Media</strong> informa en qué posición ordinal promedio colocaron los participantes a la palabra.
          </p>
          <p>
            Una palabra con jerarquía media cercana a <strong>1.00</strong> significa que casi todos los participantes que la mencionaron la ubicaron como su concepto primordial. Por el contrario, valores cercanos a 8, 9 o 10 indican que la palabra actúa como un elemento accesorio o secundario.
          </p>
        </div>
      ),
    },
    {
      id: 10,
      title: '10. Núcleo SAM y Núcleo Adaptativo',
      summary: 'Criterios para delimitar el corazón semántico de la red.',
      content: (
        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          <p>
            El <strong>Núcleo SAM (Significado Aceptado Metodológicamente)</strong> agrupa a las definidoras que concentran el mayor peso semántico del estímulo.
          </p>
          <div className="space-y-2">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="font-bold text-slate-900 block">SAM Tradicional (Top-10):</span>
              <p className="text-slate-600">Por convención metodológica clásica, se toman las 10 palabras con mayor Valor M.</p>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="font-bold text-slate-900 block">Corte Scree Test (Punto de Quiebre):</span>
              <p className="text-slate-600">
                La plataforma calcula la gráfica de sedimentación (scree plot) de los Valores M y detecta automáticamente el punto de quiebre donde la curva se aplana, identificando empíricamente el tamaño real del núcleo (que puede ser de 5, 8 o 12 palabras según los datos).
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 11,
      title: '11. Distancia Semántica Cuantitativa (FMG)',
      formula: 'FMG (%) = (Valor M de la palabra / Valor M máximo) × 100',
      summary: 'Porcentaje relativo de cercanía respecto a la definidora central.',
      content: (
        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          <p>
            El <strong>Porcentaje FMG</strong> estandariza los pesos semánticos en una escala del 0% al 100%:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-slate-600">
            <li>La palabra con el mayor Valor M del grupo siempre tiene <strong>FMG = 100%</strong> (actúa como ancla o punto cero de distancia).</li>
            <li>Todas las demás palabras reciben un porcentaje proporcional a su cercanía con la palabra principal.</li>
          </ul>
          <div className="p-3 bg-slate-100 rounded-xl font-mono text-center text-xs font-bold text-slate-800">
            Ejemplo: Si la palabra 1 tiene M = 200 (FMG = 100%) y la palabra 2 tiene M = 150, su FMG = (150/200)*100 = 75%.
          </div>
          <p>
            Permite comparar la estructura semántica entre muestras de diferentes tamaños con plena validez psicométrica.
          </p>
        </div>
      ),
    },
    {
      id: 12,
      title: '12. Valor G: Gradiente de dispersión',
      formula: 'G = M_1 - M_n  (Diferencia entre el primer y último peso del núcleo SAM)',
      summary: 'Diferencia sustancial entre el gradiente semántico tradicional y la densidad topológica.',
      content: (
        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          <p>
            El <strong>Valor G</strong> representa la distancia o pendiente entre la palabra más fuerte y la última palabra que integra el núcleo SAM.
          </p>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1 text-amber-950">
            <p className="font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Precaución Metodológica: No confundir Valor G con Densidad</span>
            </p>
            <p className="text-slate-700 text-[11px]">
              El <strong>Valor G tradicional</strong> es un gradiente numérico de caída en los pesos de las palabras. NO debe confundirse con la <em>densidad topológica de un grafo</em> (que mide el porcentaje de aristas existentes sobre el total posible de conexiones entre nodos). Ambos son indicadores valiosos pero miden fenómenos completamente distintos.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 13,
      title: '13. Visualización y análisis de redes',
      summary: 'Transformación de tablas tabulares en grafos asociativos interactivos.',
      content: (
        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          <p>
            Aunque las tablas estadísticas son fundamentales, la mente humana procesa conceptos mediante estructuras relacionales. Al convertir las palabras del núcleo SAM en <strong>nodos</strong> y sus coocurrencias o similitudes en <strong>aristas</strong>, se obtiene un mapa visual del campo de significado.
          </p>
          <p>
            La plataforma incluye controles de física de fuerzas (repulsión de nodos, gravedad central, rigidez de enlace) que permiten explorar dinámicamente cómo se agrupan las palabras.
          </p>
        </div>
      ),
    },
    {
      id: 14,
      title: '14. Pathfinder: Nodos, enlaces y limitaciones',
      summary: 'Algoritmo de redes asociativas de Schvaneveldt, parámetros q y r, y advertencias epistemológicas.',
      content: (
        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          <p>
            El algoritmo <strong>Pathfinder Network Scaling (PFNet)</strong>, introducido por Schvaneveldt (1990), poda las conexiones espurias de una red mediante la desigualdad triangular en espacios métricos de Minkowski:
          </p>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <p className="font-bold text-slate-900">Parámetros del Pathfinder:</p>
            <ul className="list-disc pl-4 space-y-1 text-slate-600 text-[11px]">
              <li><strong>Parámetro r (Métrica de distancia):</strong> Habitualmente r = ∞ (métrica Chebyshev), lo que significa que el costo de un camino está determinado por su enlace más débil.</li>
              <li><strong>Parámetro q (Límite de pasos):</strong> Generalmente q = n - 1 (donde n es el número de nodos), lo que produce la red con la menor cantidad de enlaces no redundantes.</li>
            </ul>
          </div>
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-950 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>Limitación e Interpretación Rigurosa</span>
            </p>
            <p className="text-slate-700 text-[11px]">
              Los enlaces de una red Pathfinder representan <em>relaciones de proximidad asociativa estimada</em>. La inspección visual de un enlace NO equivale automáticamente a una simulación psicológica de activación en tiempo real ni a una conexión sináptica neuronal directa.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 15,
      title: '15. Comparación de dos estímulos',
      summary: 'Palabras exclusivas, compartidas y codificación visual bicolor.',
      content: (
        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          <p>
            Cuando un estudio analiza dos estímulos (ej. <em>DOLOR vs. SUFRIMIENTO</em>), la plataforma permite realizar una comparación estructural directa:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-slate-600">
            <li><strong>Palabras exclusivas del estímulo 1:</strong> Nodos identificados con Color A (ej. Azul).</li>
            <li><strong>Palabras exclusivas del estímulo 2:</strong> Nodos identificados con Color B (ej. Naranja).</li>
            <li><strong>Palabras compartidas:</strong> Nodos con <strong>fondo dividido bicolor</strong> (mitad color A y mitad color B), señalando de inmediato el puente semántico común.</li>
          </ul>
          <p>
            Esta codificación visual permite al investigador responder si dos conceptos comparten su núcleo afectivo o si representan realidades cognitivas disociadas.
          </p>
        </div>
      ),
    },
    {
      id: 16,
      title: '16. Interpretación y exportación de resultados',
      summary: 'Descarga en formatos CSV, JSON, matrices de coocurrencia e informes formateados.',
      content: (
        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          <p>
            La plataforma permite exportar todos los datos calculados en formatos estándares listos para artículos de investigación o tesis:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="font-bold text-slate-900 block">CSV Datos Brutos</span>
              <p className="text-slate-500 text-[11px]">Cada asociación, rango, tiempo de respuesta y fecha de captura.</p>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="font-bold text-slate-900 block">CSV Tablas RSN</span>
              <p className="text-slate-500 text-[11px]">Tabla resumen con J, FA, M, FMG, media de rangos y pertenencia a SAM.</p>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="font-bold text-slate-900 block">JSON Estructurado</span>
              <p className="text-slate-500 text-[11px]">Estructura completa para importar a R, Python (NetworkX) o Gephi.</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 17,
      title: '17. Preguntas frecuentes y solución de problemas',
      summary: 'Respuestas a dudas metodológicas y situaciones atípicas frecuentes.',
      content: (
        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          <div className="space-y-3">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <p className="font-bold text-slate-900">¿Qué pasa si un participante no completó la jerarquización?</p>
              <p className="text-slate-600">
                La plataforma detecta este caso y lo clasifica como «Parcial». En el módulo de Calidad y Auditoría puedes decidir si conservar las palabras generadas o excluir la sesión del cómputo grupal.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <p className="font-bold text-slate-900">¿Cuántos participantes mínimos se requieren?</p>
              <p className="text-slate-600">
                Metodológicamente, se recomiendan al menos 20 a 30 participantes por estrato demográfico para obtener un núcleo SAM estable y representativo.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <p className="font-bold text-slate-900">¿Se pueden usar tres o más estímulos?</p>
              <p className="text-slate-600">
                Sí. La plataforma calcula el RSN clásico para todos los estímulos que desees. La visualización bicolor de Pathfinder y la síntesis comparativa automática están optimizadas específicamente para pares de dos estímulos.
              </p>
            </div>
          </div>
        </div>
      ),
    },
  ];

  const filteredChapters = chapters.filter(c =>
    c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.summary.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeChapter = chapters.find(c => c.id === selectedChapterId) || chapters[0];

  return (
    <UserLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-primary-600" />
              <span>Manual de Redes Semánticas Naturales</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Guía didáctica completa en 17 capítulos con fórmulas, ejemplos y fundamentos metodológicos.
            </p>
          </div>

          <Link
            to="/app"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver a mi Panel</span>
          </Link>
        </div>

        {/* Layout: Chapters Nav (Left) + Content (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Chapters Navigation */}
          <div className="lg:col-span-4 space-y-3">
            {/* Search Box */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Buscar capítulo o concepto..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-250 pl-9 pr-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Chapters List */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-2 shadow-xs max-h-[70vh] overflow-y-auto space-y-1">
              {filteredChapters.map(chap => {
                const isSelected = chap.id === selectedChapterId;
                return (
                  <button
                    key={chap.id}
                    onClick={() => setSelectedChapterId(chap.id)}
                    className={`w-full text-left p-3 rounded-xl transition-all flex items-start justify-between gap-2 ${
                      isSelected
                        ? 'bg-primary-50 border border-primary-300 text-primary-950 font-bold shadow-2xs'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">{chap.title}</p>
                      <p className="text-[11px] text-slate-500 line-clamp-1 font-normal mt-0.5">
                        {chap.summary}
                      </p>
                    </div>
                    <ChevronRight
                      className={`w-4 h-4 shrink-0 mt-0.5 transition-transform ${
                        isSelected ? 'text-primary-600 translate-x-0.5' : 'text-slate-300'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Selected Chapter Content */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
              <div className="pb-4 border-b border-slate-100 space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary-600">
                  Capítulo {activeChapter.id} de 17
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {activeChapter.title}
                </h2>
                <p className="text-xs text-slate-500">{activeChapter.summary}</p>
              </div>

              {/* Formula block if exists */}
              {activeChapter.formula && (
                <div className="p-4 bg-slate-900 text-white rounded-2xl font-mono text-xs shadow-xs space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">
                    Fórmula Metodológica:
                  </span>
                  <p className="font-bold text-primary-300 text-sm">{activeChapter.formula}</p>
                </div>
              )}

              {/* Main Chapter Content */}
              <div className="pt-2">{activeChapter.content}</div>

              {/* Navigation buttons at bottom */}
              <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                <button
                  disabled={activeChapter.id <= 1}
                  onClick={() => setSelectedChapterId(prev => Math.max(1, prev - 1))}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    activeChapter.id <= 1
                      ? 'text-slate-300 cursor-not-allowed'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Capítulo Anterior</span>
                </button>

                <button
                  disabled={activeChapter.id >= chapters.length}
                  onClick={() => setSelectedChapterId(prev => Math.min(chapters.length, prev + 1))}
                  className={`px-4 py-2 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-500 text-white flex items-center gap-1.5 transition-all shadow-xs ${
                    activeChapter.id >= chapters.length ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <span>Siguiente Capítulo</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </UserLayout>
  );
};
