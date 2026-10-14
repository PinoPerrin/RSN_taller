# DECISIONES METODOLÓGICAS Y TRATAMIENTO DE DIVERGENCIAS
## Plataforma de Redes Semánticas Naturales (RSN)

En concordancia con los principios rectores de rigurosidad científica y transparencia, este documento identifica las divergencias, matices y modificaciones históricas encontradas en la literatura científica (`1.zip` y `2.zip`), estableciendo formalmente las decisiones de diseño adoptadas sin recurrir a resoluciones arbitrarias.

---

## 1. Ponderación Jerárquica en Participantes con Menos de Diez Asociaciones

### Estado en la Literatura
* **Reyes Lagunes (1993, p. 83) y Valdez Medina (2005, p. 72):**
  Establecen que el participante jerarquiza sus asociaciones colocando el 1 a la más importante, el 2 a la siguiente, y así sucesivamente. Para el cálculo del Peso Semántico (Valor M), cada rango se multiplica por una escala descendente fija donde la jerarquía 1 se multiplica por 10, la 2 por 9, la 3 por 8, etc. ($VS(r) = 11 - r$).
* **Pregunta metodológica:** Si un participante solo produce 5 palabras en el tiempo límite de 60 segundos y las jerarquiza del 1 al 5, ¿su primera palabra debe recibir 10 puntos (escala fija) o 5 puntos (escala adaptada a su tamaño)?
* **Análisis crítico:**
  * Si recibe 10 puntos, se asume que su asociación más relevante tiene el mismo peso psicológico de primer orden que la asociación más relevante de un sujeto que produjo 10 palabras.
  * Si se ajustara a una escala de 5 puntos (5, 4, 3, 2, 1), se penalizaría la importancia atribuida a su palabra principal solo por tener una red individual más corta.

### Decisión de Diseño en la Plataforma
1. **Opción Predeterminada (Canónica):**
   Se adopta el esquema de ponderación fija canónica de Reyes-Lagunes (1993) y Valdez Medina (2005):
   $$VS(r) = 11 - r \quad \forall r \in \{1, \dots, m_i\}$$
   donde la primera definidora siempre recibe 10 puntos, la segunda 9 puntos, etc.
2. **Opción Configurable:**
   Se proporciona en la configuración del proyecto la alternativa de ponderación normalizada proporcional:
   $$VS_{\text{norm}}(r, m_i) = \left( \frac{m_i + 1 - r}{m_i} \right) \times 10$$
3. **Trazabilidad:** Cada informe, tabla y gráfico consigna de manera visible e inequívoca el esquema de ponderación utilizado en el cálculo.

---

## 2. Delimitación Estructural: Conjunto SAM vs. Núcleo de la Red (NR)

### Estado en la Literatura
* **Tradición Clásica (Figueroa et al., 1981, p. 111; Valdez Medina, 2005, p. 73):**
  Define el **Conjunto SAM** (*Significado Atribuido en la Memoria*) como las 10 definidoras con mayor valor M (o 15 según Bravo, 1991). Se trata de un criterio cuantitativo de tamaño fijo.
* **Tradición Modificada (Reyes Lagunes, 1993, pp. 83–84; Vera-Noriega et al., 2005, p. 447):**
  Argumenta que fijar a priori 10 palabras carece de sustento teórico cuando se desconoce el tamaño del universo conceptual y puede excluir palabras empatadas o incluir palabras con peso insignificante. Propone sustituirlo por el **Núcleo de la Red (NR)** delimitado mediante el *Scree Test* de Cattell (1952) buscando el punto de quiebre donde la curva de pesos semánticos se vuelve asintótica respecto al eje horizontal.

### Decisión de Diseño en la Plataforma
1. La aplicación **no confunde ni fusiona** ambos conceptos.
2. En las tablas de resultados se incluyen dos columnas diferenciadas:
   * Columna `SAM`: Indicador booleano (Sí/No) de pertenencia al Top-$k$ ($k=10$ configurable a 15).
   * Columna `Núcleo`: Indicador booleano (Sí/No) de pertenencia al conjunto delimitado por el punto de quiebre.
3. Se implementa el algoritmo de detección automática de codo (*Kneedle algorithm* adaptado a series discretas de valores M), permitiendo además al investigador inspeccionar la curva visual interactiva y verificar el punto de inflexión.

---

## 3. Desambiguación del Concepto de "Densidad": Valor G vs. Densidad de Grafo

### Estado en la Literatura
* **Figueroa et al. (1981b) y Valdez Medina (2005, p. 78):**
  Definen el **Valor G** como:
  $$G = \frac{\sum_{i=1}^9 (M_i - M_{i+1})}{9} = \frac{M_1 - M_{10}}{9}$$
  y lo denominan históricamente como "densidad de la red semántica". Mide la tasa promedio de decremento entre las definidoras del conjunto SAM.
* **Teoría de Grafos Contemporánea (Newman, 2003; Siew et al., 2019, p. 4):**
  Define la **Densidad del Grafo ($D$)** como la fracción de aristas existentes sobre el número total posible de aristas no dirigidas:
  $$D = \frac{2E}{V(V-1)}$$

### Decisión de Diseño en la Plataforma
1. Queda estrictamente prohibido utilizar el término ambiguo "densidad" sin su adjetivo calificador.
2. En el módulo de RSN Clásica, el indicador se etiqueta como **"Gradiente de dispersión del SAM (Valor G de Figueroa/Valdez)"**, con unidad en puntos de peso M por rango.
3. En el módulo de Análisis Contemporáneo, el indicador se etiqueta como **"Densidad topológica del grafo ($D$)"**, con rango adimensional $[0, 1]$.
4. Cada indicador cuenta con un icono de información técnica que despliega su fórmula, autoría y significado matemático.

---

## 4. Separación Estructural de Modelos de Red

### Estado en la Literatura
* En la tradición psicométrica de RSN (Figueroa, Reyes Lagunes, Valdez), la red observada empíricamente es una estructura centralizada centrada en el concepto estímulo (red radial / estrella), donde las definidoras no tienen conexiones directas observadas entre sí en la tarea experimental.
* En la ciencia de redes contemporánea (Steyvers & Tenenbaum, 2005; Christensen & Kenett, 2021; Siew et al., 2019), las relaciones entre palabras se derivan de matrices de coocurrencia intrasujeto o asociaciones continuadas, formando redes complejas generales.

### Decisión de Diseño en la Plataforma
1. Se construyen dos modelos de red completamente separados:
   * **Modelo A: Red Estímulo-Definidoras (RSN Tradicional):**
     * Estructura: Grafo radial / estrella.
     * Nodo central: Palabra estímulo.
     * Nodos periféricos: Definidoras.
     * Aristas: Estímulo $\to$ Definidora con peso proporcional al Valor M o FMG.
     * Restricción: No se calculan métricas topológicas complejas (ASPL, clustering, modularidad) sobre este grafo, pues una estrella produce valores triviales ($CC = 0$, $L \approx 2$) que no aportan información psicológica válida.
   * **Modelo B: Red de Coocurrencias (Ciencia Cognitiva de Redes):**
     * Nodos: Definidoras.
     * Aristas: Coocurrencia en las respuestas de los mismos participantes.
     * Ponderación: Coocurrencia absoluta o similitud de Jaccard.
     * Métricas: Sobre este modelo se aplican válidamente Densidad, Centralidad, ASPL, Clustering y Detección de Comunidades (Louvain).

---

## 5. Tratamiento de Sinonimia y Normalización Semántica

### Estado en la Literatura
* Valdez y Hernández (1986) y Valdez Medina (2005, p. 76) proponen la formación de "categorías semánticas" agrupando términos sinónimos (ej. *madre-mamá, rojo-colorado, amigo-cuate*).
* Reyes Lagunes (1993, p. 85) advierte expresamente que agrupar términos unifica el significado denotativo pero destruye el matiz connotativo y afectivo que el sujeto expresó deliberadamente.

### Decisión de Diseño en la Plataforma
1. **Inviolabilidad del dato original:** El texto original escrito por el participante se preserva inmutable en la base de datos.
2. **Normalización no destructiva en capas:**
   * La normalización técnica básica (espacios en blanco, capitalización) es automática.
   * La unificación de sinónimos o lemas es **exclusivamente manual y supervisada por el investigador**.
3. **Diccionario de reglas auditable:** Toda fusión requiere justificación, registra usuario y fecha, y es 100% reversible con un clic.
4. **Cálculo en paralelo:** El administrador puede alternar los resultados entre la "Versión Bruta" y la "Versión Normalizada", visualizando el impacto exacto en los indicadores.

---

## 6. Registro e Interpretación de Tiempos de Respuesta

### Advertencia Metodológica
El tiempo que transcurre mientras un participante escribe en un teléfono celular no es un indicador puro del tiempo de reacción o acceso léxico en la memoria semántica, ya que está contaminado por la velocidad de escritura con teclado virtual, autocorrección, tamaño de pantalla y distracciones ambientales.

### Decisión de Diseño en la Plataforma
1. Los tiempos se registran con precisión de milisegundos en el cliente mediante la API de alta precisión (`performance.now()` y `Date.now()`).
2. Se registran por separado:
   * Instante de presentación del estímulo.
   * Tiempo hasta la primera confirmación.
   * Intervalos inter-palabra.
   * Tiempo de la fase de jerarquización.
3. En los informes y pantallas analíticas, los tiempos se rotulan formalmente como **"Indicadores Exploratorios de Proceso"**, evitando afirmaciones concluyentes sobre latencias neurológicas o cronometría mental.

---

## 7. MODELO DE ASOCIACIÓN DE RUMELHART Y TRATAMIENTO DE DISTANCIAS PATHFINDER

### 7.1. Problema Matemático
La ecuación de asociación conexionista de Rumelhart (Sánchez et al., 2013, p. 224):
$$w_{ij} = \ln\left( \frac{P_{11} P_{00}}{P_{10} P_{01}} \right)$$
presenta tres escenarios matemáticos críticos que impiden su conversión directa a distancias métricas sin tratamiento:
1. **Probabilidades Cero:** Si dos palabras nunca coocurren ($P_{11} = 0$), $\ln(0) = -\infty$. Si $P_{10} = 0$ o $P_{01} = 0$, ocurre una división por cero ($\infty$).
2. **Pesos Nulos o Negativos ($w_{ij} \le 0$):** Si se aplica la transformación por recíproco $d_{ij} = 1/w_{ij}$ ingenuamente, los pesos negativos generan distancias negativas ($d_{ij} < 0$), lo que viola el axioma de no negatividad de las métricas de Minkowski y produce distancias complejas o ciclos negativos.
3. **División por Cero en la Inversión:** Si $w_{ij} = 0$, $1/0$ queda indefinido.

### 7.2. Decisión Metodológica
1. **Suavizado Bayesiano de Haldane-Anscombe:**
   Para calcular las frecuencias conjuntas, se añade una constante de suavizado $\epsilon = 0.5$ a cada celda de contingencia ($n_{11}, n_{10}, n_{01}, n_{00}$). Esto garantiza que $P_{ab} > 0$ en toda la matriz, elimina indeterminaciones matemáticas y mantiene la coherencia bayesiana con el estimador no sesgado del log-odds ratio.
2. **Tratamiento de Pesos No Excitatorios:**
   Siguiendo el principio conexionista de esquemas, los pesos $w_{ij} \le 0$ representan ausencia de coocurrencia o inhibición mutua en la memoria colectiva (los conceptos no cooperan para formar el esquema). Por tanto, la distancia métrica se define formalmente como:
   $$d_{ij} = \begin{cases} 0 & \text{si } i = j \\ \frac{1}{w_{ij}} & \text{si } w_{ij} > 0 \\ \infty & \text{si } w_{ij} \le 0 \end{cases}$$
   Al asignar $d_{ij} = \infty$, el algoritmo Pathfinder no crea aristas directas espurias entre palabras sin asociación positiva.

---

## 8. ANÁLISIS PATHFINDER: MULTI-ESTÍMULO VS. MONO-ESTÍMULO

### 8.1. Diferencia Metodológica
En el estudio de Sánchez et al. (2013), los autores obtuvieron los conjuntos SAM de 7 estímulos ambientales distintos y luego construyeron la matriz de coocurrencia considerando la aparición de las palabras a lo largo de todos los estímulos en cada participante. Esto permite identificar enlaces trans-estímulo (ej. conectar *fábricas* con *autos* a través de *tráfico*).

### 8.2. Decisión en la Plataforma
1. **Modalidad Principal (Multi-estímulo):** Se permite seleccionar múltiples estímulos del proyecto y combinar sus conjuntos SAM en una sola matriz conexionista, reproduciendo fielmente la metodología de Sánchez et al. (2013) y del programa SemNet.
2. **Modalidad Mono-estímulo (Adaptación):** Si el estudio cuenta con un único estímulo, la matriz de coocurrencia se calcula a nivel de los participantes individuales de ese estímulo. Esta modalidad se etiqueta expresamente en la interfaz como una **"Adaptación metodológica de Pathfinder"**, aclarando que no constituye la réplica idéntica de la estructura trans-estímulo de SemNet.

