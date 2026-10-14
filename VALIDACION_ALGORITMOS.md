# VALIDACIÓN DE ALGORITMOS Y CONJUNTOS DE DATOS DE PRUEBA
## Plataforma de Redes Semánticas Naturales (RSN)

Este documento define los casos de prueba matemáticos, conjuntos de datos sintéticos controlados y salidas numéricas esperadas para la verificación algorítmica automatizada de la plataforma.

---

## 1. Banco de Pruebas Canónico 1: "Estímulo DOLOR" (Sección 21.1)

### 1.1. Datos de Entrada Sintéticos

| Participante | Palabra 1 (Jerarquía 1) | Palabra 2 (Jerarquía 2) | Palabra 3 (Jerarquía 3) |
|:---:|:---:|:---:|:---:|
| **Participante A** | Ardor | Miedo | Cansancio |
| **Participante B** | Miedo | Ardor | *(sin respuesta)* |
| **Participante C** | Ardor | Sufrimiento | Miedo |

* **Configuración del Instrumento:**
  * Estímulo: `DOLOR`
  * Número de participantes ($N$): 3
  * Máximo de asociaciones ($K_{\max}$): 10
  * Esquema de ponderación: Canónico ($VS(r) = 11 - r$)

---

### 1.2. Cálculos Paso a Paso e Indicadores Tradicionales Esperados

#### 1. Frecuencias y Pesos Semánticos Individuales
* **Ardor:**
  * Participante A: Rango 1 $\to 10$ puntos
  * Participante B: Rango 2 $\to 9$ puntos
  * Participante C: Rango 1 $\to 10$ puntos
  * $f(\text{Ardor}) = 3$
  * $M(\text{Ardor}) = 10 + 9 + 10 = \mathbf{29}$
  * Jerarquía media $\bar{r} = \frac{1 + 2 + 1}{3} = \frac{4}{3} \approx \mathbf{1.333}$

* **Miedo:**
  * Participante A: Rango 2 $\to 9$ puntos
  * Participante B: Rango 1 $\to 10$ puntos
  * Participante C: Rango 3 $\to 8$ puntos
  * $f(\text{Miedo}) = 3$
  * $M(\text{Miedo}) = 9 + 10 + 8 = \mathbf{27}$
  * Jerarquía media $\bar{r} = \frac{2 + 1 + 3}{3} = \frac{6}{3} = \mathbf{2.000}$

* **Sufrimiento:**
  * Participante C: Rango 2 $\to 9$ puntos
  * $f(\text{Sufrimiento}) = 1$
  * $M(\text{Sufrimiento}) = 9 = \mathbf{9}$
  * Jerarquía media $\bar{r} = \mathbf{2.000}$

* **Cansancio:**
  * Participante A: Rango 3 $\to 8$ puntos
  * $f(\text{Cansancio}) = 1$
  * $M(\text{Cansancio}) = 8 = \mathbf{8}$
  * Jerarquía media $\bar{r} = \mathbf{3.000}$

#### 2. Indicadores Globales de Red Semántica
* **Valor J (Tamaño de la Red):**
  $$J = |\{\text{Ardor, Miedo, Sufrimiento, Cansancio}\}| = \mathbf{4}$$
* **Valor Máximo:**
  $$M_{\max} = M(\text{Ardor}) = \mathbf{29}$$
* **Distancia Semántica Cuantitativa (FMG %):**
  * $FMG(\text{Ardor}) = \frac{29}{29} \times 100 = \mathbf{100.00\%}$
  * $FMG(\text{Miedo}) = \frac{27}{29} \times 100 = \mathbf{93.10\%}$ (exacto: $93.103448...\%$)
  * $FMG(\text{Sufrimiento}) = \frac{9}{29} \times 100 = \mathbf{31.03\%}$ (exacto: $31.034482...\%$)
  * $FMG(\text{Cansancio}) = \frac{8}{29} \times 100 = \mathbf{27.59\%}$ (exacto: $27.586206...\%$)
* **Conjunto SAM ($k=10$):**
  Como $J = 4 \le 10$, el conjunto SAM contiene las 4 definidoras ordenadas:
  $$SAM = [\text{Ardor (29)}, \text{Miedo (27)}, \text{Sufrimiento (9)}, \text{Cansancio (8)}]$$
* **Núcleo de la Red (Scree Test):**
  * Diferencias: $\Delta M_1 = 29 - 27 = 2$, $\Delta M_2 = 27 - 9 = 18$ (quiebre masivo), $\Delta M_3 = 9 - 8 = 1$.
  * El salto abrupto ocurre tras 'Miedo'.
  * $NR = [\text{Ardor, Miedo}]$ con tamaño $|NR| = 2$.
* **Valor G de Figueroa/Valdez (para $k=4$ definidoras disponibles):**
  $$G = \frac{M_{(1)} - M_{(4)}}{4 - 1} = \frac{29 - 8}{3} = \frac{21}{3} = \mathbf{7.00}$$

---

### 1.3. Cálculos de Teoría de Grafos y Coocurrencia

#### 1. Matriz de Coocurrencia de Definidoras ($C$)

| | Ardor | Miedo | Sufrimiento | Cansancio |
|---|:---:|:---:|:---:|:---:|
| **Ardor** | (3) | **3** | **1** | **1** |
| **Miedo** | **3** | (3) | **1** | **1** |
| **Sufrimiento** | **1** | **1** | (1) | **0** |
| **Cansancio** | **1** | **1** | **0** | (1) |

* Explicación:
  * Ardor y Miedo coocurren en las listas de A, B y C $\implies C = 3$.
  * Ardor y Sufrimiento coocurren solo en C $\implies C = 1$.
  * Ardor y Cansancio coocurren solo en A $\implies C = 1$.
  * Miedo y Sufrimiento coocurren solo en C $\implies C = 1$.
  * Miedo y Cansancio coocurren solo en A $\implies C = 1$.
  * Cansancio y Sufrimiento nunca aparecen juntos $\implies C = 0$.

#### 2. Matriz de Similitud de Jaccard ($J$)
* $J(\text{Ardor, Miedo}) = \frac{3}{3 + 3 - 3} = \frac{3}{3} = \mathbf{1.000}$
* $J(\text{Ardor, Sufrimiento}) = \frac{1}{3 + 1 - 1} = \frac{1}{3} \approx \mathbf{0.3333}$
* $J(\text{Ardor, Cansancio}) = \frac{1}{3 + 1 - 1} = \frac{1}{3} \approx \mathbf{0.3333}$
* $J(\text{Miedo, Sufrimiento}) = \frac{1}{3 + 1 - 1} = \frac{1}{3} \approx \mathbf{0.3333}$
* $J(\text{Miedo, Cansancio}) = \frac{1}{3 + 1 - 1} = \frac{1}{3} \approx \mathbf{0.3333}$
* $J(\text{Sufrimiento, Cansancio}) = \frac{0}{1 + 1 - 0} = \mathbf{0.000}$

#### 3. Propiedades Topológicas de la Red (umbral de arista $w > 0$)
* **Nodos ($V$):** 4
* **Aristas ($E$):** 5 aristas no dirigidas: {(Ardor, Miedo), (Ardor, Sufrimiento), (Ardor, Cansancio), (Miedo, Sufrimiento), (Miedo, Cansancio)}.
* **Densidad del Grafo ($D$):**
  $$D = \frac{2(5)}{4(3)} = \frac{10}{12} = \mathbf{0.8333}$$
* **Grados Nodales ($k$):**
  * $k(\text{Ardor}) = 3$
  * $k(\text{Miedo}) = 3$
  * $k(\text{Sufrimiento}) = 2$
  * $k(\text{Cansancio}) = 2$
  * Grado promedio $\langle k \rangle = \frac{3 + 3 + 2 + 2}{4} = \mathbf{2.50}$
* **Fuerza Nodal Ponderada (pesos absolutos $C$):**
  * $s(\text{Ardor}) = 3 + 1 + 1 = \mathbf{5}$
  * $s(\text{Miedo}) = 3 + 1 + 1 = \mathbf{5}$
  * $s(\text{Sufrimiento}) = 1 + 1 = \mathbf{2}$
  * $s(\text{Cansancio}) = 1 + 1 = \mathbf{2}$
* **Longitud Media de Caminos Más Cortos (ASPL / $L$):**
  Pares de nodos: $\binom{4}{2} = 6$ pares.
  * $d(\text{Ardor, Miedo}) = 1$
  * $d(\text{Ardor, Sufrimiento}) = 1$
  * $d(\text{Ardor, Cansancio}) = 1$
  * $d(\text{Miedo, Sufrimiento}) = 1$
  * $d(\text{Miedo, Cansancio}) = 1$
  * $d(\text{Sufrimiento, Cansancio}) = 2$ (camino: Sufrimiento $\leftrightarrow$ Ardor $\leftrightarrow$ Cansancio)
  * Promedio:
    $$L = \frac{1 + 1 + 1 + 1 + 1 + 2}{6} = \frac{7}{6} \approx \mathbf{1.1667}$$
* **Coeficiente de Agrupamiento (Clustering Coefficient - CC):**
  * Para Ardor ($k=3$): sus vecinos son {Miedo, Sufrimiento, Cansancio}. De 3 pares posibles entre vecinos, existen 2 conexiones (Miedo-Sufrimiento y Miedo-Cansancio):
    $$C_i(\text{Ardor}) = \frac{2}{3} \approx 0.6667$$
  * Para Miedo ($k=3$): sus vecinos son {Ardor, Sufrimiento, Cansancio}. Conexiones entre vecinos: 2 (Ardor-Sufrimiento y Ardor-Cansancio):
    $$C_i(\text{Miedo}) = \frac{2}{3} \approx 0.6667$$
  * Para Sufrimiento ($k=2$): sus vecinos son {Ardor, Miedo}. Conexiones entre vecinos: 1 (Ardor-Miedo):
    $$C_i(\text{Sufrimiento}) = \frac{1}{1} = 1.000$$
  * Para Cansancio ($k=2$): sus vecinos son {Ardor, Miedo}. Conexiones entre vecinos: 1 (Ardor-Miedo):
    $$C_i(\text{Cansancio}) = \frac{1}{1} = 1.000$$
  * Coeficiente Global:
    $$CC = \frac{2/3 + 2/3 + 1 + 1}{4} = \frac{3.3333}{4} \approx \mathbf{0.8333}$$

---

## 2. Banco de Pruebas de Casos Límite (*Edge Cases*)

### Test Case 2.1: Participante con una sola palabra
* Entrada: Sujeto genera únicamente "Pena" y le asigna jerarquía 1.
* Salida esperada:
  * $J = 1$.
  * $M(\text{Pena}) = 10$.
  * $FMG(\text{Pena}) = 100\%$.
  * Red de coocurrencia: 1 nodo, 0 aristas. Densidad = 0. $L = 0$. $CC = 0$.

### Test Case 2.2: Respuesta vacía (omisión total / agotamiento de tiempo)
* Entrada: Participante no escribe palabras antes de que concluya el cronómetro.
* Salida esperada:
  * Se registra sesión con estado `abandoned_or_empty`.
  * La respuesta no aporta filas a la matriz de incidencias.
  * No produce divisiones por cero ni errores de índice.

### Test Case 2.3: Empates perfectos en Valor M
* Entrada: Dos definidoras "Luz" y "Sol" obtienen exactamente los mismos pesos:
  * Luz: jerarquía 1 (1 sujeto), jerarquía 2 (1 sujeto) $\to M = 19$.
  * Sol: jerarquía 1 (1 sujeto), jerarquía 2 (1 sujeto) $\to M = 19$.
* Salida esperada:
  * Ambos tienen $FMG$ idéntico.
  * Orden alfabético para visualización, pero idéntico rango y pertenencia a SAM / Núcleo.

### Test Case 2.4: Grafo completamente desconectado (sin aristas concurrentes)
* Entrada: 3 participantes escriben conjuntos disjuntos: S1={A, B}, S2={C, D}, S3={E, F}.
* Salida esperada:
  * 3 componentes conectados independientes de tamaño 2.
  * Densidad muy baja.
  * Detección de comunidades identifica 3 comunidades independientes con $Q$ positivo.
  * ASPL calculado formalmente sobre los componentes individuales, reportando número de componentes $c = 3$.

---

## 3. Pruebas de Validación: Redes Pathfinder (PFNET) y Modelo de Rumelhart

### Test Case 3.1: Log-Odds Ratio de Rumelhart
* **Entrada:**
  * $P_{11} = 0.40, P_{00} = 0.40, P_{10} = 0.10, P_{01} = 0.10$.
* **Cálculo manual:**
  $$\text{Odds Ratio} = \frac{0.40 \times 0.40}{0.10 \times 0.10} = \frac{0.16}{0.01} = 16.0$$
  $$w_{ij} = \ln(16.0) \approx 2.7725887$$
* **Salida esperada de la función `calculateRumelhartWeights`:**
  $w_{ij} \approx 2.7726$.

### Test Case 3.2: Poda de Arista Redundante en Triángulo (Minkowski $r = \infty, q = 2$)
* **Entrada:** Matriz de distancias para 3 nodos $\{A, B, C\}$:
  * $d(A, B) = 3$
  * $d(B, C) = 4$
  * $d(A, C) = 8$
* **Cálculo manual del camino alternativo $A \to B \to C$:**
  $$L(A \to B \to C) = \max(d(A, B), d(B, C)) = \max(3, 4) = 4$$
* **Regla de decisión:**
  La distancia directa $d(A, C) = 8 > L(A \to B \to C) = 4$.
  Por lo tanto, la conexión directa $A-C$ es redundante y se elimina.
* **Salida esperada de `runPathfinder(D, 'inf', 2)`:**
  * Enlaces conservados: $\{A-B, B-C\}$ (Total aristas = 2).
  * Arista $A-C$ es eliminada (`pfnetAdjacency[0][2] = false`).

### Test Case 3.3: Conservación con $q = 1$
* **Entrada:** Misma matriz de distancias anterior con $q = 1$.
* **Condición:** Con $q = 1$, no se permite explorar caminos de 2 o más aristas.
* **Salida esperada:**
  * Se conservan todas las aristas directas: $\{A-B, B-C, A-C\}$ (Total aristas = 3).

