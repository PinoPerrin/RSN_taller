# MATRIZ DE INDICADORES CIENTÍFICOS
## Plataforma de Redes Semánticas Naturales (RSN)

Esta matriz constituye el núcleo normativo y algorítmico de la plataforma. Ningún cálculo se realiza en la aplicación sin encontrarse rigurosamente especificado en esta matriz.

---

### Indicador 1: Tamaño de la Red (Valor J / TR)
* **Nombre del indicador:** Valor J / Tamaño de la Red (TR)
* **Tradición:** RSN clásica (Figueroa et al., 1981) y RSN modificada (Reyes Lagunes, 1993; Valdez Medina, 2005)
* **Definición:** Número total de palabras definidoras diferentes producidas por el conjunto de participantes para un estímulo dado. Refleja la amplitud léxica o riqueza semántica colectiva.
* **Fórmula:**
  $$J = |V| = \left| \bigcup_{i=1}^N W_i \right|$$
* **Variables:**
  * $V$: Conjunto de definidoras únicas normalizadas.
  * $W_i$: Lista de palabras producidas por el participante $i$.
  * $N$: Total de participantes que respondieron al estímulo.
* **Entrada:** Vector de respuestas asociativas de todos los participantes al estímulo.
* **Salida:** Número entero no negativo ($J \in \mathbb{N}_0$).
* **Interpretación:** Mayor valor J indica mayor diversidad semántica, dispersión conceptual o menor consenso normativo. No debe interpretarse por sí solo como mayor conocimiento sin considerar el tamaño de muestra $N$.
* **Fuente:** Figueroa et al. (1981, p. 113); Reyes Lagunes (1993, p. 83); Valdez Medina (2005, p. 72).
* **Implementación:** `calculateValorJ(associations: NormalizedAssociation[]): number`
* **Validación:**
  * Sujetos A={ardor, miedo}, B={miedo, dolor}, C={ardor, tristeza}.
  * $V = \{\text{ardor, miedo, dolor, tristeza}\}$.
  * $J = 4$.

---

### Indicador 2: Frecuencia de Definidoras ($f$)
* **Nombre del indicador:** Frecuencia absoluta y relativa de aparición
* **Tradición:** RSN clásica y modificada
* **Definición:** Número de participantes que mencionaron una definidora particular para un estímulo determinado (máximo una vez por participante).
* **Fórmula:**
  $$f(j) = \sum_{i=1}^N \mathbb{I}(j \in W_i), \quad f_{rel}(j) = \frac{f(j)}{N}$$
* **Variables:**
  * $\mathbb{I}(\cdot)$: Función indicatriz (1 si el sujeto $i$ mencionó la palabra $j$, 0 en caso contrario).
  * $N$: Número total de participantes analizados.
* **Entrada:** Listas de palabras de los $N$ participantes.
* **Salida:** $f(j) \in \{1, \dots, N\}$, $f_{rel}(j) \in (0, 1]$.
* **Interpretación:** Mide la prevalencia o popularidad espontánea de un concepto en el grupo.
* **Fuente:** Reyes Lagunes (1993, p. 83); Valdez Medina (2005, p. 72).
* **Implementación:** `calculateFrequencies(responses: ParticipantResponse[]): Map<string, number>`
* **Validación:**
  * De 3 sujetos, 'ardor' aparece en 2 sujetos: $f(\text{ardor}) = 2, f_{rel} = 2/3 \approx 0.667$.

---

### Indicador 3: Peso Semántico (Valor M / PS)
* **Nombre del indicador:** Valor M / Peso Semántico (PS)
* **Tradición:** RSN clásica (Figueroa et al., 1981) y RSN modificada (Reyes Lagunes, 1993; Valdez Medina, 2005)
* **Definición:** Sumatoria de los productos de la frecuencia de aparición de una definidora en cada posición jerárquica por el valor ponderado asignado a dicha posición. Representa la importancia y centralidad psicológica de la definidora para el estímulo.
* **Fórmula:**
  $$M(j) = \sum_{r=1}^{k} f(j, r) \times VS(r)$$
  En la escala estándar de $k=10$ posiciones:
  $$VS(r) = (k + 1) - r = 11 - r \quad (r = 1, \dots, 10)$$
  Por tanto:
  $$M(j) = \sum_{r=1}^{10} f(j, r) \times (11 - r)$$
* **Variables:**
  * $f(j, r)$: Frecuencia con que la palabra $j$ fue asignada a la jerarquía $r$.
  * $VS(r)$: Valor semántico asignado a la jerarquía $r$ ($VS(1)=10, VS(2)=9, \dots, VS(10)=1$).
  * $r$: Rango jerárquico asignado ($1 \le r \le 10$).
* **Entrada:** Matriz de frecuencias por definidora y jerarquía.
* **Salida:** Número entero positivo ($M(j) \ge 1$).
* **Interpretación:** A mayor valor M, mayor relevancia cognitiva y centralidad semántica en la representación mental colectiva del concepto.
* **Fuente:** Reyes Lagunes (1993, pp. 83–84); Valdez Medina (2005, pp. 72–73).
* **Implementación:** `calculateValorM(associations: RankedAssociation[], maxK = 10): Map<string, number>`
* **Validación:**
  * Para definidora 'ardor': asignada al rango 1 por 2 sujetos ($2 \times 10 = 20$) y al rango 2 por 1 sujeto ($1 \times 9 = 9$).
  * $M(\text{ardor}) = 20 + 9 = 29$.

---

### Indicador 4: Distancia Semántica Cuantitativa (FMG / DSC)
* **Nombre del indicador:** Valor FMG / Distancia Semántica Cuantitativa (DSC)
* **Tradición:** RSN clásica (Figueroa et al., 1981) y RSN modificada (Reyes Lagunes, 1993; Valdez Medina, 2005)
* **Definición:** Medida de proporción o cercanía relativa porcentual de cada definidora con respecto a la definidora que obtuvo el mayor peso semántico ($M_{\max}$), a la cual se le asigna el 100%.
* **Fórmula:**
  $$FMG(j) = \left[ \frac{M(j)}{M_{\max}} \right] \times 100$$
  donde $M_{\max} = \max_{k \in V} M(k)$.
* **Variables:**
  * $M(j)$: Peso semántico de la definidora $j$.
  * $M_{\max}$: Peso semántico más alto obtenido en la red para dicho estímulo.
* **Entrada:** Vector de valores M de todas las definidoras del estímulo.
* **Salida:** Porcentaje real continuo entre $0\% < FMG(j) \le 100\%$.
* **Interpretación:** Expresa la proximidad relativa al nodo central en comparación con el prototipo máximo. Permite comparar la estructura interna de redes con diferentes tamaños de muestra $N$.
* **Fuente:** Reyes Lagunes (1993, p. 84); Valdez Medina (2005, p. 73).
* **Implementación:** `calculateFMG(valorMMap: Map<string, number>): Map<string, number>`
* **Validación:**
  * $M(\text{ardor}) = 29$ ($M_{\max} = 29 \implies FMG = 100\%$).
  * $M(\text{miedo}) = 27 \implies FMG = (27/29) \times 100 \approx 93.10\%$.
  * $M(\text{sufrimiento}) = 9 \implies FMG = (9/29) \times 100 \approx 31.03\%$.

---

### Indicador 5: Conjunto SAM
* **Nombre del indicador:** Conjunto SAM (Significado Atribuido en la Memoria)
* **Tradición:** RSN clásica (Figueroa et al., 1981; Valdez Medina, 2005)
* **Definición:** Subconjunto canónico conformado por las 10 definidoras (o 15 según Bravo, 1991) con los mayores pesos semánticos (valores M).
* **Fórmula:**
  $$SAM = \text{Top}_k(\{ (j, M(j)) : j \in V \}), \quad k \in \{10, 15\}$$
  Regla de desempate canónica (Valdez Medina, 2005, p. 74):
  1. Mayor frecuencia en jerarquía 1 ($f(j, 1)$).
  2. Mayor frecuencia en jerarquía 2 ($f(j, 2)$) ... hasta jerarquía $k$.
  3. Si persiste el empate en el límite del conjunto ($k$-ésimo lugar), se incluyen todas las definidoras empatadas.
* **Variables:**
  * $k$: Tamaño del conjunto ($10$ por defecto).
* **Entrada:** Diccionario de definidoras con valor M y desglose de frecuencias por jerarquía.
* **Salida:** Lista ordenada de palabras con sus atributos $M$ y $FMG$.
* **Interpretación:** Representa el núcleo semántico operativo principal de la categoría o estímulo.
* **Fuente:** Figueroa et al. (1981, p. 111); Valdez Medina (2005, pp. 73–74).
* **Implementación:** `getConjuntoSAM(definidoras: DefinidoraStats[], k = 10): DefinidoraStats[]`
* **Validación:**
  * En una lista de 15 palabras ordenadas por M, se seleccionan las primeras 10. Si la posición 10 y 11 empatan en todos los criterios, ambas se incluyen ($|SAM| = 11$).

---

### Indicador 6: Núcleo de la Red (NR) por Punto de Quiebre (Scree Test)
* **Nombre del indicador:** Núcleo de la Red (NR)
* **Tradición:** RSN modificada (Reyes Lagunes, 1993; Vera-Noriega et al., 2005; Vargas-Garduño et al., 2014)
* **Definición:** Grupo de definidoras que anteceden al punto de inflexión o pérdida de pendiente marcada (carácter asintótico respecto al eje horizontal) en la curva de pesos semánticos descendentes, análogo al criterio *Scree Test* de Cattell (1952).
* **Fórmula:**
  Dado el vector ordenado descendentemente $M_{(1)} \ge M_{(2)} \ge \dots \ge M_{(J)}$, se calcula la primera diferencia $\Delta M_i = M_{(i)} - M_{(i+1)}$ y la segunda diferencia (aceleración) $\Delta^2 M_i = \Delta M_i - \Delta M_{i+1}$.
  El punto de quiebre $i^*$ se identifica donde:
  $$\Delta M_i < \epsilon \quad \text{o} \quad i^* = \arg\max_i (\Delta M_i - \Delta M_{i+1}) \quad \text{con } \Delta M_{i+1} \approx \text{constante}$$
* **Variables:**
  * $M_{(i)}$: $i$-ésimo valor M ordenado.
  * $\Delta M_i$: Caída del peso semántico entre posiciones consecutivas.
* **Entrada:** Serie descendente de valores M de todas las definidoras.
* **Salida:** Subconjunto de definidoras $NR = \{ j_{(1)}, \dots, j_{(i^*)} \}$ y valor de corte $i^*$.
* **Interpretación:** Identifica objetivamente las palabras centrales que concentran la estructura del significado sin forzar arbitrariamente un corte fijo de 10 palabras. Si el corte ocurre antes de 10, el concepto tiene alta cohesión; si supera 10, presenta multisignificado o heterogeneidad.
* **Fuente:** Reyes Lagunes (1993, pp. 83–84); Vera-Noriega et al. (2005, p. 447).
* **Implementación:** `calculateNucleoRed(orderedDefinidoras: DefinidoraStats[]): { cutoffIndex: number, nucleo: DefinidoraStats[] }`
* **Validación:**
  * Pesos M: 200, 185, 170, 60, 55, 52, 50, 48.
  * Caídas: $200-185=15$, $185-170=15$, $170-60=110$ (quiebre masivo), $60-55=5$, $55-52=3$.
  * El quiebre asintótico ocurre en la posición 3. Núcleo = {1, 2, 3}.

---

### Indicador 7: Valor G (Densidad de la Red Semántica Clásica)
* **Nombre del indicador:** Valor G
* **Tradición:** RSN clásica (Figueroa et al., 1981; Valdez Medina, 2005)
* **Definición:** Promedio de las diferencias sucesivas entre los valores M de las 10 definidoras del conjunto SAM. Cuantifica el gradiente de caída o densidad de dispersión semántica entre las definidoras principales.
* **Fórmula:**
  $$G = \frac{\sum_{i=1}^{k-1} (M_{(i)} - M_{(i+1)})}{k - 1}$$
  Nótese que por propiedad telescópica:
  $$G = \frac{M_{(1)} - M_{(k)}}{k - 1}$$
  Para $k=10$:
  $$G = \frac{M_{(1)} - M_{(10)}}{9}$$
* **Variables:**
  * $M_{(1)}$: Valor M de la primera definidora del SAM (máximo).
  * $M_{(10)}$: Valor M de la décima definidora del SAM.
  * $k$: Tamaño del conjunto de referencia ($k = 10$).
* **Entrada:** Los 10 primeros valores M ordenados del SAM.
* **Salida:** Número real no negativo ($G \ge 0$).
* **Interpretación:** Un valor G alto indica una gran distancia o caída abrupta entre la definidora principal y las subsecuentes (fuerte polarización hacia una definidora prototípica). Un valor G bajo indica homogeneidad o pesos equilibrados en el conjunto SAM.
* **Fuente:** Figueroa et al. (1981b, citado en Valdez Medina, 2005, p. 78).
* **Implementación:** `calculateValorG(samMValues: number[]): number`
* **Validación:**
  * $M_{(1)} = 180, M_{(10)} = 18$.
  * $G = \frac{180 - 18}{9} = \frac{162}{9} = 18.0$.

---

### Indicador 8: Índice de Consenso Grupal (ICG)
* **Nombre del indicador:** Índice de Consenso Grupal (ICG)
* **Tradición:** RSN modificada (Reyes Lagunes, 1993)
* **Definición:** Porcentaje de palabras definidoras compartidas entre dos o más grupos de estudio respecto al total de definidoras únicas encontradas.
* **Fórmula:**
  $$ICG(A, B) = \left[ \frac{|V_A \cap V_B|}{|V_A \cup V_B|} \right] \times 100$$
  Equivalente al Coeficiente de Jaccard expresado en porcentaje.
* **Variables:**
  * $V_A$: Conjunto de definidoras del grupo A.
  * $V_B$: Conjunto de definidoras del grupo B.
* **Entrada:** Listas de definidoras de los grupos A y B.
* **Salida:** Porcentaje entre $0\%$ y $100\%$.
* **Interpretación:** Evalúa el grado de equivalencia semántica cultural entre poblaciones distintas (ej. hombres vs mujeres, jóvenes vs adultos).
* **Fuente:** Reyes Lagunes (1993, p. 84).
* **Implementación:** `calculateICG(wordsA: Set<string>, wordsB: Set<string>): number`
* **Validación:**
  * $V_A = \{\text{dolor, ardor, tristeza}\}$, $V_B = \{\text{dolor, pena, llanto, tristeza}\}$.
  * $V_A \cap V_B = \{\text{dolor, tristeza}\}$ ($| \cap | = 2$).
  * $V_A \cup V_B = \{\text{dolor, ardor, tristeza, pena, llanto}\}$ ($| \cup | = 5$).
  * $ICG = (2 / 5) \times 100 = 40.0\%$.

---

### Indicadores 9 a 13: Métricas Individuales de RSN (Valores S, F, L, H, C)
* **Valor S:** Total de definidoras generadas por un sujeto individual para un estímulo: $S_i = |W_{ij}|$.
* **Valor F:** Promedio de definidoras generadas por un sujeto para una batería de $E$ estímulos: $F_i = \frac{1}{E} \sum_{e=1}^E S_{ie}$.
* **Valor L:** Suma de los pesos M grupales correspondientes a las definidoras individuales que coincidieron con el conjunto SAM:
  $$L_i = \sum_{w \in (W_i \cap SAM)} M_{grupal}(w)$$
* **Valor H:** Suma de los valores L de todos los sujetos del grupo: $H = \sum_{i=1}^N L_i$.
* **Valor C:** Concordancia ordinal del participante con el orden de SAM. Se compara la posición del sujeto con la posición en SAM. Si coincide exactamente se asignan 9 puntos; por cada puesto de desviación se resta 1. Porcentaje sobre el máximo de 90 puntos (Valdez Medina, 2005, p. 79).
* **Fuente:** Valdez Medina (2005, p. 79), citando a Figueroa et al. (1981b).

---

### Indicador 14: Matriz de Coocurrencia de Definidoras ($C$)
* **Nombre del indicador:** Matriz de coocurrencia nodal
* **Tradición:** Enfoque contemporáneo de redes semánticas (Christensen & Kenett, 2021; Siew et al., 2019; De Deyne et al., 2013)
* **Definición:** Frecuencia con la que un par de definidoras coaparecen en la lista de respuestas de un mismo participante para el estímulo.
* **Fórmula:**
  Dada la matriz binaria de incidencia $X \in \{0, 1\}^{N \times V}$, donde $X_{ij} = 1$ si el participante $i$ escribió la definidora $j$:
  $$C = X^T X \quad \implies \quad C_{jk} = \sum_{i=1}^N X_{ij} X_{ik} \quad (\text{para } j \neq k)$$
  Con $C_{jj} = f(j)$.
* **Variables:**
  * $N$: Número de participantes.
  * $V$: Número de definidoras únicas.
  * $X_{ij}$: Presencia (1) o ausencia (0) de la palabra $j$ en el sujeto $i$.
* **Entrada:** Matriz binaria sujeto $\times$ definidora.
* **Salida:** Matriz simétrica $V \times V$ con ceros en la diagonal (o frecuencias en diagonal).
* **Interpretación:** Representa la fuerza de asociación contextual entre pares de palabras definidoras.
* **Fuente:** Christensen & Kenett (2021, pp. 11–13); Siew et al. (2019, p. 4).
* **Implementación:** `buildCooccurrenceMatrix(responses: BinaryResponseMatrix): Matrix`
* **Validación:**
  * Sujetos: S1: {A, B, C}, S2: {A, B}, S3: {A, C}.
  * $C_{AB} = 2$ (S1 y S2), $C_{AC} = 2$ (S1 y S3), $C_{BC} = 1$ (S1).

---

### Indicador 15: Similitud de Coocurrencia de Jaccard ($J_{jk}$)
* **Nombre del indicador:** Coeficiente de Jaccard entre definidoras
* **Tradición:** Enfoque contemporáneo
* **Definición:** Coocurrencia de dos definidoras normalizada por la unión de participantes en cuyas listas aparece al menos una de ellas.
* **Fórmula:**
  $$J_{jk} = \frac{C_{jk}}{f(j) + f(k) - C_{jk}}$$
* **Variables:**
  * $C_{jk}$: Número de participantes donde coocurren $j$ y $k$.
  * $f(j), f(k)$: Frecuencias marginales de $j$ y $k$.
* **Entrada:** Matriz de coocurrencia $C$ y frecuencias $f$.
* **Salida:** Matriz simétrica de similitud con valores en $[0, 1]$.
* **Interpretación:** Ponderación normalizada de aristas inmune a sesgos de alta frecuencia marginal.
* **Fuente:** Christensen & Kenett (2021, p. 12); Siew et al. (2019, p. 4).
* **Implementación:** `calculateJaccardSimilarity(coocMatrix: Matrix, freqs: number[]): Matrix`
* **Validación:**
  * $f(A) = 3, f(B) = 2, C_{AB} = 2 \implies J_{AB} = \frac{2}{3 + 2 - 2} = \frac{2}{3} \approx 0.667$.

---

### Indicador 16: Densidad del Grafo ($D$)
* **Nombre del indicador:** Densidad de red
* **Tradición:** Teoría de grafos y Ciencia Cognitiva de Redes
* **Definición:** Proporción de aristas existentes respecto al total teórico posible en un grafo no dirigido de $V$ nodos.
* **Fórmula:**
  $$D = \frac{2E}{V(V - 1)}$$
* **Variables:**
  * $E$: Número de aristas existentes (con peso mayor al umbral de filtrado).
  * $V$: Número de nodos en la red.
* **Entrada:** Grafo no dirigido $G = (V, E)$.
* **Salida:** Número real en el intervalo $[0, 1]$.
* **Interpretación:** Mide la interconexión global. No confundir con el Valor G de Figueroa (densidad semántica de diferencias M).
* **Fuente:** Siew et al. (2019, p. 4); Christensen & Kenett (2021, p. 20).
* **Implementación:** `calculateGraphDensity(nodesCount: number, edgesCount: number): number`
* **Validación:**
  * Para $V=4$ nodos y $E=3$ aristas: $D = \frac{2(3)}{4(3)} = \frac{6}{12} = 0.50$.

---

### Indicador 17: Coeficiente de Agrupamiento (Clustering Coefficient - CC)
* **Nombre del indicador:** Coeficiente de agrupamiento local ($C_i$) y global ($CC$)
* **Tradición:** Teoría de grafos / Redes complejas (Watts & Strogatz, 1998; Steyvers & Tenenbaum, 2005)
* **Definición:**
  * **Local ($C_i$):** Fracción de triángulos alrededor del nodo $i$, es decir, la probabilidad de que dos vecinos del nodo $i$ estén conectados entre sí.
  * **Global ($CC$):** Promedio de los coeficientes locales de todos los nodos con grado $k_i \ge 2$.
* **Fórmula:**
  $$C_i = \frac{2 e_i}{k_i (k_i - 1)} = \frac{\sum_{j, h} A_{ij} A_{jh} A_{hi}}{k_i (k_i - 1)}$$
  $$CC = \frac{1}{|V'|} \sum_{i \in V'} C_i \quad \text{donde } V' = \{ i \in V : k_i \ge 2 \}$$
* **Variables:**
  * $e_i$: Número de aristas conectando a los vecinos del nodo $i$.
  * $k_i$: Grado del nodo $i$.
  * $A$: Matriz de adyacencia binaria.
* **Entrada:** Matriz de adyacencia de la red de coocurrencia filtrada.
* **Salida:** $C_i \in [0, 1]$, $CC \in [0, 1]$.
* **Interpretación:** Alto agrupamiento en redes semánticas refleja organización modular y facilitación en la activación de conceptos afines.
* **Fuente:** Steyvers & Tenenbaum (2005, p. 47); Siew et al. (2019, p. 4); Christensen & Kenett (2021, p. 20).
* **Implementación:** `calculateClusteringCoefficient(adjMatrix: Matrix): { localCC: number[], globalCC: number }`
* **Validación:**
  * Triángulo de 3 nodos (A, B, C): cada uno tiene 2 vecinos conectados entre sí: $C_A = C_B = C_C = 1.0 \implies CC = 1.0$.
  * Estrella de 4 nodos (nodo central con 3 hojas no conectadas entre sí): $C_{hojas}=0$, $C_{centro} = \frac{0}{3(2)/2} = 0 \implies CC = 0.0$.

---

### Indicador 18: Longitud Media de Caminos Más Cortos (ASPL / $L$)
* **Nombre del indicador:** Average Shortest Path Length (ASPL / $L$)
* **Tradición:** Teoría de grafos (Steyvers & Tenenbaum, 2005; Christensen & Kenett, 2021)
* **Definición:** Distancia geodésica promedio (número mínimo de pasos) entre todos los pares de nodos en el componente conectado principal.
* **Fórmula:**
  $$L = \frac{1}{V(V - 1)} \sum_{i \neq j} d(i, j)$$
  donde $d(i, j)$ es la longitud del camino más corto entre el nodo $i$ y el nodo $j$ calculado mediante el algoritmo de Dijkstra o Floyd-Warshall.
* **Variables:**
  * $d(i, j)$: Distancia mínima de pasos entre nodos $i$ y $j$.
* **Entrada:** Grafo conectado o componente gigante del grafo de coocurrencias.
* **Salida:** Número real positivo ($L \ge 1.0$).
* **Interpretación:** Longitud de camino corta indica rápida propagación de la activación léxica y alta conectividad asociativa; longitudes mayores se asocian con rigidez o fragmentación.
* **Fuente:** Steyvers & Tenenbaum (2005, p. 47); Christensen & Kenett (2021, p. 20).
* **Implementación:** `calculateASPL(distMatrix: Matrix): number`
* **Validación:**
  * Línea de 3 nodos A-B-C: $d(A,B)=1, d(A,C)=2, d(B,C)=1$.
  * $L = \frac{2 \times (1 + 2 + 1)}{3 \times 2} = \frac{8}{6} \approx 1.333$.

---

### Indicador 19: Modularidad ($Q$) y Comunidades (Louvain)
* **Nombre del indicador:** Índice de modularidad de Newman ($Q$)
* **Tradición:** Teoría de grafos contemporánea (Newman, 2006; Blondel et al., 2008; Christensen & Kenett, 2021)
* **Definición:** Medida que cuantifica la fuerza de la división de una red en módulos o comunidades. Compara la densidad de aristas intra-comunidad con la esperada en un modelo nulo aleatorio.
* **Fórmula:**
  $$Q = \frac{1}{2m} \sum_{i, j} \left[ A_{ij} - \frac{k_i k_j}{2m} \right] \delta(c_i, c_j)$$
* **Variables:**
  * $A_{ij}$: Peso de la arista entre $i$ y $j$.
  * $k_i, k_j$: Grados de los nodos $i$ y $j$.
  * $m = \frac{1}{2} \sum_{i,j} A_{ij}$: Peso total de aristas en la red.
  * $c_i$: Comunidad a la que pertenece el nodo $i$.
  * $\delta(u, v)$: Función delta de Kronecker (1 si $u=v$, 0 si no).
* **Entrada:** Matriz de adyacencia de coocurrencias.
* **Salida:** $Q \in [-0.5, 1.0]$ y vector de membresía comunitaria $\{c_i\}$.
* **Interpretación:** Valores $Q \ge 0.3$ indican una fuerte división modular en subtemas o facetas del concepto estímulo.
* **Fuente:** Newman (2006); Christensen & Kenett (2021, p. 21).
* **Implementación:** `detectLouvainCommunities(adjMatrix: Matrix): { Q: number, communities: Map<string, number> }`
* **Validación:**
  * Dos triángulos desconectados: $Q = 0.50$ con 2 comunidades diferenciadas.

---

### Indicador 20: Centralidades Nodales (Grado, Cercanía, Intermediación)
* **Centralidad de Grado ($C_D(i)$):** $C_D(i) = \frac{k_i}{V - 1}$.
* **Centralidad de Cercanía ($C_C(i)$):** $C_C(i) = \frac{V - 1}{\sum_{j \neq i} d(i, j)}$.
* **Centralidad de Intermediación ($C_B(i)$):** $C_B(i) = \sum_{s \neq i \neq t} \frac{\sigma_{st}(i)}{\sigma_{st}}$.
* **Interpretación:** Identifica nodos puente, palabras conectoras entre diferentes clústeres temáticos y definidoras centrales.
* **Fuente:** Siew et al. (2019, pp. 4–5); Christensen & Kenett (2021, p. 20).
* **Implementación:** `calculateNodeCentralities(graph: Graph): Map<string, NodeCentrality>`

---

### Indicador 21: Pesos de Asociación Conexionista de Rumelhart ($w_{ij}$)
* **Nombre del indicador:** Peso asociativo probabilístico de Rumelhart ($w_{ij}$)
* **Tradición:** Tradición Mexicana RSN • SemNet (Sánchez et al., 2013) y Conexionismo PDP (Rumelhart et al., 1986)
* **Definición:** Medida de la fuerza asociativa simétrica entre dos conceptos basada en el Log-Odds Ratio de sus probabilidades de coocurrencia e independencia en la memoria de trabajo de la muestra.
* **Fórmula:**
  $$w_{ij} = \ln\left( \frac{P_{11} P_{00}}{P_{10} P_{01}} \right)$$
* **Variables:**
  * $P_{11}$: Probabilidad de aparición conjunta de $x_i$ y $x_j$.
  * $P_{10}$: Probabilidad de presencia de $x_i$ con ausencia de $x_j$.
  * $P_{01}$: Probabilidad de ausencia de $x_i$ con presencia de $x_j$.
  * $P_{00}$: Probabilidad de ausencia simultánea de ambos conceptos.
  * Suavizado bayesiano: $n_{ab}^* = n_{ab} + 0.5$.
* **Entrada:** Listas de palabras producidas por los participantes para los estímulos evaluados.
* **Salida:** Matriz cuadrada simétrica $V \times V$ con $w_{ij} \in (-\infty, +\infty)$.
* **Interpretación:** $w_{ij} > 0$ indica atracción / excitación asociativa mutua en el esquema cognitivo. $w_{ij} = 0$ indica independencia estadística. $w_{ij} < 0$ indica inhibición o incompatibilidad semántica.
* **Fuente:** Sánchez Miranda, De la Garza & López Ramírez (2013, p. 224); Rumelhart et al. (1986).
* **Implementación:** `calculateRumelhartWeights(contingencyMatrix: ContingencyCell[][]): number[][]`
* **Validación:**
  * Si $P_{11}=0.4, P_{00}=0.4, P_{10}=0.1, P_{01}=0.1 \implies \text{OR} = 16.0 \implies w_{ij} = \ln(16) \approx 2.7726$.

---

### Indicador 22: Red Asociativa Pathfinder ($PFNET(r, q)$)
* **Nombre del indicador:** Red Asociativa Pathfinder (PFNET)
* **Tradición:** Escalamiento de Redes de Conocimiento (Schvaneveldt et al., 1982; Schvaneveldt, 1990; Sánchez et al., 2013)
* **Definición:** Estructura de red que extrae las trayectorias de menor distancia semántica entre conceptos, podando aristas redundantes que posean caminos alternativos de menor o igual longitud Minkowski.
* **Fórmula:**
  Longitud de camino:
  $$L(P) = \left( \sum_{m=1}^k d(v_{m-1}, v_m)^r \right)^{1/r}, \quad L_{\infty} = \max_{1 \le m \le k} d(v_{m-1}, v_m)$$
  Distancia de entrada:
  $$d_{ij} = \frac{1}{w_{ij}} \quad (\text{para } w_{ij} > 0); \quad d_{ij} = \infty \quad (\text{para } w_{ij} \le 0)$$
  Criterio de retención de arista:
  $$e(i, j) \in PFNET \iff d_{ij} \le D_{ij}^{(q)} = \min_{\substack{P \in \text{Paths}(i, j) \\ 2 \le |P| \le q}} L(P)$$
* **Variables:**
  * $r \in [1, \infty]$: Métrica de Minkowski ($r=\infty$ por defecto).
  * $q \in [1, V-1]$: Límite de conexiones en rutas alternativas ($q=V-1$ por defecto).
* **Entrada:** Matriz de distancias $D$.
* **Salida:** Matriz de adyacencia binaria y lista de aristas conservadas.
* **Interpretación:** Destaca los enlaces fundamentales del léxico mental sin redundancias; los conceptos con mayor grado actúan como organizadores centrales del esquema.
* **Fuente:** Schvaneveldt (1990); Sánchez et al. (2013, p. 225); Manual SemNet v3.22 (2014, p. 23).
* **Implementación:** `runPathfinder(initialDistances: number[][], r = 'inf', q?: number)`
* **Validación:**
  * Triángulo $d_{12}=3, d_{23}=4, d_{13}=8$: Con $r=\infty, q=2$, $L(1-2-3) = \max(3, 4) = 4 < 8$, por lo que la arista $(1, 3)$ se poda y la red retiene exactamente 2 enlaces.

---

### Indicador 23: Índice de Similaridad Estructural ($ISE$)
* **Nombre del indicador:** Índice de Similaridad Estructural (ISE)
* **Tradición:** Tradición Mexicana RSN • SemNet (Sánchez Miranda, De la Garza & López Ramírez, 2013)
* **Definición:** Coeficiente cuantitativo de semejanza topológica entre dos redes semánticas Pathfinder comparando sus enlaces conservados comunes y específicos.
* **Fórmula:**
  $$ISE = \frac{|E_A \cap E_B|}{|E_A \cup E_B|}$$
  Y para un concepto específico $v$:
  $$ISE(v) = \frac{|\text{Vecinos}_A(v) \cap \text{Vecinos}_B(v)|}{|\text{Vecinos}_A(v) \cup \text{Vecinos}_B(v)|}$$
* **Variables:**
  * $E_A, E_B$: Conjuntos de aristas conservadas en las redes Pathfinder del grupo $A$ y grupo $B$.
* **Entrada:** Dos redes Pathfinder computadas sobre el mismo vocabulario.
* **Salida:** Escalar continuo $ISE \in [0.0, 1.0]$.
* **Interpretación:** $ISE = 1.0$ indica redes idénticas. $ISE = 0.0$ indica ninguna conexión compartida. Valores $> 0.50$ revelan esquemas cognitivos altamente congruentes entre subgrupos.
* **Fuente:** Sánchez et al. (2013, p. 227 y Tabla 3).
* **Implementación:** `calculateStructuralSimilarity(netA: PathfinderResult, netB: PathfinderResult)`
* **Validación:**
  * Red $A = \{A-B, B-C\}$ y Red $B = \{A-B, C-D\}$: aristas compartidas = 1 ($A-B$), unión = 3 $\implies ISE = 1/3 \approx 0.333$.

