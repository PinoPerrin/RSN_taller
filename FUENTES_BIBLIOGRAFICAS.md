# FUENTES BIBLIOGRÁFICAS Y DOCUMENTACIÓN METODOLÓGICA
## Plataforma Científica de Redes Semánticas Naturales (RSN)

Este documento contiene el corpus bibliográfico completo analizado a partir de los archivos de referencia `1.zip` (Tradición Clásica y Mexicana de RSN) y `2.zip` (Enfoque Contemporáneo de Redes Semánticas y Teoría de Grafos), documentado rigurosamente conforme al formato **APA 7ª edición**, especificando archivo de origen, páginas clave, indicadores descritos y aportes metodológicos.

---

## 1. Tradición Clásica y Mexicana de Redes Semánticas Naturales (RSN) (`1.zip`)

### 1.1. Figueroa, González y Solís (1981)
* **Referencia APA 7:**
  Figueroa, J. G., González, E. G., & Solís, V. M. (1981). An approach to the problem of meaning: Semantic networks. *Journal of Psycholinguistic Research*, 10(2), 107–121. https://doi.org/10.1007/BF01067500
* **Archivo de origen:** `approach to the problem of meaning.pdf` (9 págs., pp. 107–121).
* **Aporte conceptual:**
  Trabajo seminal que fundó la técnica de las Redes Semánticas Naturales (RSN). Postula que el significado de un concepto está integrado en la memoria mediante relaciones reconstructivas con otros conceptos y propiedades, superando el modelo conductista de asociación simple.
* **Aspectos metodológicos y fórmulas documentadas:**
  * Procedimiento original con 5 definidoras por concepto: ponderación de rangos con pesos descendentes de 5 a 1 ($P_1 = 5, P_2 = 4, P_3 = 3, P_4 = 2, P_5 = 1$) (p. 110).
  * En tareas con listas predefinidas de 15 palabras: ponderación de 12 a 1 (p. 111).
  * Concepto de definidoras de mayor peso (origen del conjunto SAM y valor M).
  * Criterio de sinonimia usando diccionarios lexicográficos de referencia (p. 111).
  * Distinción empírica entre memoria de definición semántica y tarea de asociación libre pura (pp. 112–114).

---

### 1.2. Reyes Lagunes (1993)
* **Referencia APA 7:**
  Reyes Lagunes, I. (1993). Las redes semánticas naturales, su conceptualización y su utilización en la construcción de instrumentos. *Revista de Psicología Social y Personalidad*, 9(1), 81–97.
* **Archivo de origen:** `Las Redes Semánticas Naturales, su Conceptualización y su Utilización en la Construcción de Instrume.pdf` (15 págs., pp. 81–97).
* **Aporte conceptual:**
  Formalización psicométrica y estandarización de la técnica en México conocida como **Redes Semánticas Naturales Modificadas (RSNM)**. Establece la escala canónica de 10 jerarquías y propone sustituir el límite fijo de 10 palabras del SAM por el criterio empírico de punto de quiebre factorial (Cattell, 1952).
* **Aspectos metodológicos y fórmulas documentadas:**
  * **Ponderación canónica:** Jerarquía 1 = 10 puntos, 2 = 9 puntos, ..., 10 = 1 punto ($VS(r) = 11 - r$) (p. 83).
  * **Valor J / Tamaño de la Red (TR):** Total de definidoras diferentes generadas por el grupo ($J = |V|$) (p. 83).
  * **Valor M / Peso Semántico (PS):** Sumatoria del producto de la frecuencia en cada jerarquía por el valor ponderado:
    $$M(j) = \sum_{r=1}^{10} f(j, r) \times (11 - r)$$ (pp. 83–84).
  * **Núcleo de la Red (NR):** Delimitación matemática mediante el *Scree Test* de Cattell (1952). Graficación de los pesos semánticos ordenados descendentemente y corte en el punto donde la curva se torna asintótica respecto al eje horizontal (pp. 83–84).
  * **Distancia Semántica Cuantitativa (FMG / DSC):**
    $$FMG(j) = \frac{M(j)}{M_{\max}} \times 100$$ (p. 84).
  * **Índice de Consenso Grupal (ICG):** Porcentaje de definidoras en las que coinciden dos o más subgrupos (p. 84).
  * **Carga Afectiva (CA):** Clasificación tripartita de definidoras en positivas, negativas o neutras/descriptivas, contrastada mediante $\chi^2$ (p. 85).
  * **Advertencia sobre sinonimia:** Al agrupar palabras (ej. *madre-mamá*), se unifica el significado denotativo pero se puede perder información connotativa relevante (p. 85).

---

### 1.3. Valdez Medina (1998, 2005)
* **Referencia APA 7:**
  Valdez Medina, J. L. (2005). *Las redes semánticas naturales, usos y aplicaciones en psicología social*. Universidad Autónoma del Estado de México (UAEMex). ISBN: 968-835-912-7.
* **Archivos de origen:**
  * `-las-redes-semanticas-naturales-usos-y-apl.pdf` (64 págs., fragmento metodológico clave).
  * `118-457.pdf` (140 págs., monografía integral y compilación de investigaciones empíricas).
* **Aporte conceptual:**
  Tratado exhaustivo de aplicación empírica de las RSNM en poblaciones hispanohablantes. Describe la hoja de vaciado de datos, el cálculo paso a paso y la interpretación psicológica de los indicadores.
* **Aspectos metodológicos y fórmulas documentadas:**
  * **Valor J:** Total de definidoras generadas por la muestra (pp. 72–73).
  * **Valor M:** Cálculo tabular $M = \sum (FA \times VS)$ con escala 10 a 1 (pp. 72–73).
  * **Conjunto SAM:** Las 10 definidoras con mayor valor M (o 15 según Bravo, 1991) (pp. 73–74).
  * **Regla de desempate:** En caso de empate en M, se ubica primero la definidora con mayor frecuencia en jerarquía 1; si persiste el empate, en jerarquía 2, y en último caso orden alfabético (p. 74). Si el empate se ubica en el límite del conjunto SAM, se incluyen todas las palabras empatadas para no perder información (p. 74).
  * **Valor G (Densidad de la red semántica):** Promedio de las diferencias entre las 10 definidoras del SAM:
    $$G = \frac{\sum_{i=1}^{9} (M_i - M_{i+1})}{9} = \frac{M_1 - M_{10}}{9}$$ (p. 78).
  * **Valor FMG promedio:** Promedio de los FMG de los conceptos de una categoría temática (p. 79).
  * **Indicadores individuales:**
    * **Valor S:** Riqueza individual de un participante ante un estímulo específico ($J_{ind}$) (p. 79).
    * **Valor F:** Promedio de palabras producidas por un participante a través de una lista de estímulos (p. 79).
    * **Valor L:** Suma de los pesos M de las palabras de un sujeto que coincidieron con el conjunto SAM (p. 79).
    * **Valor H:** Suma de los valores L de los sujetos de un grupo (p. 79).
    * **Valor C:** Medida de concordancia ordinal entre el orden del sujeto y el orden de SAM (p. 79).
  * **Comparación entre grupos:** $\chi^2$ para diferencias en valores J, y coeficiente de correlación de Pearson ($r$) para perfiles de valores M (p. 77).

---

### 1.4. Vera-Noriega, Pimentel y Batista de Albuquerque (2005)
* **Referencia APA 7:**
  Vera-Noriega, J. Á., Pimentel, C. E., & Batista de Albuquerque, F. J. (2005). Redes semánticas: Aspectos teóricos, técnicos, metodológicos y analíticos. *Ra Ximhai: Revista de Sociedad, Cultura y Desarrollo Sustentable*, 1(3), 439–451.
* **Archivo de origen:** `Dialnet-RedesSemanticas-1311602.pdf` (14 págs., pp. 439–451).
* **Aporte conceptual:**
  Guía didáctica y metodológica para estandarizar la administración y análisis de RSN en investigación social y transcultural.
* **Aspectos metodológicos y fórmulas documentadas:**
  * Límite temporal estandarizado: 60 segundos por palabra estímulo (p. 445).
  * Restricciones gramaticales: sustantivos, adjetivos, verbos y sintagmas breves (hasta 3 palabras); exclusión de artículos, preposiciones y oraciones completas (p. 445).
  * Muestreo: mínimo 15 participantes por celda en diseños factoriales / bloqueados (edad, sexo, escolaridad) (p. 446).
  * Verificación del Scree Test en el corte asintótico (pp. 447–448).

---

### 1.5. Vargas-Garduño, Méndez Puga y Vargas Silva (2014)
* **Referencia APA 7:**
  Vargas-Garduño, M. L., Méndez Puga, A. M., & Vargas Silva, A. D. (2014). La técnica de las redes semánticas naturales modificadas y su utilidad en la investigación cualitativa. En L. M. Salas Ocampo (Ed.), *Investigación cualitativa en educación* (pp. 1–18). Universidad Michoacana de San Nicolás de Hidalgo.
* **Archivo de origen:** `La técnica de las redes semánticas naturales modificadas y su utilidad en la investigación cualitati.pdf` (18 págs.).
* **Aporte conceptual:**
  Aplicación de las RSNM con visualización radial y articulación de análisis mixto (cuantitativo-cualitativo).
* **Aspectos metodológicos documentados:**
  * Construcción de diagramas de telaraña / radiales basados en distancias relativas FMG (pp. 9–14).
  * Clasificación empírica de carga afectiva en núcleos de red.
  * Análisis comparativo de núcleos entre estudiantes y profesores universitarios.

---

### 1.6. Zacatelco Ramírez, Osorio Gómez y Durán Fonseca (2023)
* **Referencia APA 7:**
  Zacatelco Ramírez, F. J., Osorio Gómez, S. B., & Durán Fonseca, T. D. (2023). Redes semánticas naturales: Concepto de los padres sobre aptitud sobresaliente. *Horizontes: Revista de Investigación en Ciencias de la Educación*, 7(30), 1634–1648. https://doi.org/10.33258/horizontes.v7i30.985
* **Archivo de origen:** `RSN conceptos de los padres sobre actitud sobresaliente.pdf` (15 págs., pp. 1634–1648).
* **Aporte conceptual:**
  Estudio contemporáneo riguroso que aplica la metodología RSNM de Reyes-Lagunes y Valdez en un contexto educativo real.
* **Aspectos metodológicos documentados:**
  * Uso combinado de J, M, FMG, SAM (10 definidoras) y Núcleo de Red con corte de quiebre (pp. 1638–1641).
  * Reporte tabular comparativo de definidoras, frecuencias absolutas, pesos M y porcentajes FMG.

---

## 2. Enfoque Contemporáneo: Ciencia Cognitiva de Redes y Teoría de Grafos (`2.zip`)

### 2.1. Christensen y Kenett (2021)
* **Referencia APA 7:**
  Christensen, A. P., & Kenett, Y. N. (2021). Semantic network analysis (SemNA): A tutorial on preprocessing, estimating, and analyzing semantic networks. *Psychological Methods*, Advance online publication. https://doi.org/10.1037/met0000463
* **Archivo de origen:** `MS_Semantic-Network-Tutorial_PsyArXiv.pdf` (52 págs.) y paquete `SemNeT-master.zip`.
* **Aporte conceptual:**
  Tutorial y estándar metodológico para la estimación y análisis de redes semánticas grupales a partir de datos de asociación verbal y fluidez semántica, implementado en el paquete R `SemNeT`.
* **Aspectos metodológicos y algoritmos documentados:**
  * **Matriz binaria de respuestas:** $N \times V$ donde filas son participantes y columnas definidoras ($x_{iv} \in \{0, 1\}$) (pp. 11–13).
  * **Construcción de matriz de coocurrencia:**
    $$C = X^T X \quad \text{donde } C_{jk} = \sum_{i=1}^N x_{ij} x_{ik}$$
  * **Matriz de similitud (Jaccard):**
    $$J_{jk} = \frac{C_{jk}}{f_j + f_k - C_{jk}}$$
  * **Filtrado topológico (TMFG - Triangulated Maximally Filtered Graph):** Método de planaridad que conserva $3V - 6$ aristas formando triángulos de máxima asociación, evitando arbitrariedad en puntos de corte (pp. 18–19).
  * **Medidas topológicas globales:**
    * **ASPL (Average Shortest Path Length):**
      $$L = \frac{1}{V(V-1)} \sum_{i \neq j} d(i, j)$$ (p. 20).
    * **CC (Clustering Coefficient / Coeficiente de Agrupamiento):**
      $$C_i = \frac{2 e_i}{k_i(k_i - 1)}, \quad CC = \frac{1}{V}\sum_{i=1}^V C_i$$ (pp. 20–21).
    * **Modularidad ($Q$) y algoritmo Louvain:** Partición de la red en subcomunidades maximizando el cociente de modularidad de Newman (p. 21).
  * **Inferencia estadística y pruebas de hipótesis:**
    * Comparación contra redes aleatorias nulas preservando secuencia de grados (algoritmo MCMC de Viger & Latapy) (pp. 22–23).
    * Comparaciones bootstrap entre grupos (remuestreo con reemplazo $B=1000$) y pruebas de permutación (pp. 23–25).

---

### 2.2. Siew, Wulff, Beckage y Kenett (2019)
* **Referencia APA 7:**
  Siew, C. S. Q., Wulff, D. U., Beckage, N. M., & Kenett, Y. N. (2019). Cognitive network science: A review of research on cognition through the lens of network representations, processes, and dynamics. *Complexity*, 2019, Article 2108423, 1–24. https://doi.org/10.1155/2019/2108423
* **Archivo de origen:** `Complexity - 2019 - Siew - Cognitive Network Science A Review of Research on Cognition through the Lens of Network.pdf` (24 págs.).
* **Aporte conceptual:**
  Revisión fundacional de la Ciencia Cognitiva de Redes (*Cognitive Network Science*). Discute representaciones formales, dinámicas de propagación de activación (*spreading activation*) y métricas estructurales.
* **Métricas y fórmulas documentadas:**
  * Densidad del grafo: $D = \frac{2E}{V(V-1)}$ (redes no dirigidas) (p. 4).
  * Centralidad de grado ($k_i$), cercanía ($C_C(i) = \frac{V-1}{\sum_j d(i,j)}$) e intermediación ($C_B(i) = \sum_{s \neq i \neq t} \frac{\sigma_{st}(i)}{\sigma_{st}}$) (pp. 4–5).
  * Estructura de mundo pequeño (*Small-World*): Alto agrupamiento $CC \gg CC_{rand}$ y longitud de camino reducida $L \approx L_{rand}$ (pp. 5–7).

---

### 2.3. Steyvers y Tenenbaum (2005)
* **Referencia APA 7:**
  Steyvers, M., & Tenenbaum, J. B. (2005). The large-scale structure of semantic networks: Statistical analyses and a model of semantic growth. *Cognitive Science*, 29(1), 41–78. https://doi.org/10.1207/s15516709cog2901_3
* **Archivo de origen:** `Cognitive Science - 2005 - Steyvers - The Large-Scale Structure of Semantic Networks Statistical Analyses and a Model of.pdf` (38 págs.).
* **Aporte conceptual:**
  Demostración empírica a gran escala (WordNet, Roget, asociación libre de Nelson et al.) de que las redes semánticas naturales poseen topología libre de escala (*scale-free*, distribución de grados según ley de potencias $P(k) \sim k^{-\gamma}$) y propiedades de mundo pequeño.

---

### 2.4. De Deyne, Navarro y Storms (2013)
* **Referencia APA 7:**
  De Deyne, S., Navarro, D. J., & Storms, G. (2013). Better explanations of lexical and semantic cognition using networks derived from continued rather than single word associations. *Behavior Research Methods*, 45(2), 480–498. https://doi.org/10.3758/s13428-012-0260-7
* **Archivo de origen:** `De Deyne et al. - 2013 - Better explanations of lexical and semantic cognition using networks derived from continued rather t.pdf` (19 págs.).
* **Aporte conceptual:**
  Evidencia empírica de que la técnica de asociaciones continuadas (hasta 3 o más respuestas por estímulo) captura una estructura de red semántica significativamente más rica y predictiva de tareas cognitivas que la asociación única. Modela caminos aleatorios (*random walks*) para simular similitud semántica.

---

### 2.5. Kenett, Anaki y Faust (2014)
* **Referencia APA 7:**
  Kenett, Y. N., Anaki, D., & Faust, M. (2014). Investigating the structure of semantic networks in low and high creative persons. *Frontiers in Human Neuroscience*, 8, Article 407, 1–16. https://doi.org/10.3389/fnhum.2014.00407
* **Archivo de origen:** `Kenett et al. - 2014 - Investigating the structure of semantic networks in low and high creative persons.pdf` (16 págs.).
* **Aporte conceptual:**
  Comparación metodológica rigurosa de redes semánticas entre subgrupos (alta vs baja creatividad). Demuestra cómo modularidad ($Q$) y longitud media de camino ($L$) explican diferencias funcionales en el acceso a la memoria semántica.

---

### 2.6. Maršík y Luef (2024)
* **Referencia APA 7:**
  Maršík, A., & Luef, E. M. (2024). A new tool for semantic network analysis: fan_xplorr. *Frontiers in Artificial Intelligence*, 7, Article 1358327, 1–14. https://doi.org/10.3389/frai.2024.1358327
* **Archivo de origen:** `Maršík y Luef - 2024 - A new tool for semantic network analysis fan_xplorr.pdf` (14 págs.).
* **Aporte conceptual:**
  Herramienta contemporánea interactiva para visualización y análisis de normas de asociación libre. Describe requerimientos de interacción gráfica, filtrado de aristas y exploración visual de subgrafos semánticos.

---

## 3. FUENTES ESPECÍFICAS: SIMULACIÓN CONEXIONISTA Y REDES PATHFINDER (SECCIÓN TRADICIÓN MEXICANA SEMNET)

### 3.1. Sánchez Miranda, De la Garza González y López Ramírez (2013)
* **Referencia APA 7:**
  Sánchez Miranda, M. P., De la Garza González, A., & López Ramírez, E. O. (2013). Simulaciones computacionales sobre cuestiones ambientales en dos grupos de contraste. *Liberabit: Revista Peruana de Psicología*, 19(2), 223–233.
* **Aporte conceptual y metodológico:**
  - Implementa el modelo de asociación probabilística basado en Rumelhart: $w_{ij} = \ln\left(\frac{P_{11}P_{00}}{P_{10}P_{01}}\right)$.
  - Describe la conversión de pesos en distancias mediante sus recíprocos $d_{ij} = 1/w_{ij}$.
  - Aplica las Redes Asociativas Pathfinder (PFNET) para extraer microestructuras de significado combinando los conjuntos SAM de múltiples estímulos.
  - Formaliza el **Índice de Similaridad Estructural (ISE)** para comparar matrices de activación entre grupos.

---

### 3.2. Sánchez Miranda y De la Garza González (2014) — Manual de Usuario SemNet v3.22
* **Referencia APA 7:**
  Sánchez Miranda, M. P., & De la Garza González, A. (2014). *SemNet: Programa para la obtención y análisis de Redes Semánticas Naturales (Manual de Usuario v3.22)*. Universidad Autónoma de Nuevo León (UANL).
* **Páginas clave:** pp. 22-23 (Módulos de Esquemata y Pathfinder).
* **Aporte de interfaz y visualización:**
  - Especifica la interfaz visual de las redes Pathfinder donde cada concepto se despliega con su número de conexiones directas entre corchetes (ej. `[12]`).
  - Define la interacción por microtoque para resaltar conexiones en color e inhibir/atenuar el resto de la red.

---

### 3.3. Schvaneveldt, Durso y Mukherji (1982) / Schvaneveldt (1990)
* **Referencia APA 7:**
  Schvaneveldt, R. W., Durso, F. T., & Mukherji, B. R. (1982). Semantic distance effects in categorization tasks. *Journal of Experimental Psychology: Learning, Memory, and Cognition*, 8(1), 1–15.
  Schvaneveldt, R. W. (Ed.). (1990). *Pathfinder associative networks: Studies in knowledge organization*. Ablex Publishing.
* **Aporte matemático:**
  - Algoritmo de escalamiento de redes de conocimiento Pathfinder (PFNET).
  - Parámetros $r$ (métrica de Minkowski) y $q$ (número máximo de enlaces en caminos alternativos).
  - Demostración de que la posición 2D visual no representa distancia euclidiana física.

---

### 3.4. Rumelhart, Smolensky, McClelland y Hinton (1986)
* **Referencia APA 7:**
  Rumelhart, D. E., Smolensky, P., McClelland, J. L., & Hinton, G. E. (1986). Schemata and sequential thought processes. En J. L. McClelland & D. E. Rumelhart (Eds.), *Parallel distributed processing: Explorations in the microstructure of cognition* (Vol. 2, pp. 7–57). MIT Press.
* **Aporte matemático:**
  - Deducción del modelo conexionista de pesos entre unidades de esquema a partir del log-odds ratio de las distribuciones conjuntas binarias en la memoria asociativa.

