# ESPECIFICACIONES MATEMÁTICAS Y ALGORÍTMICAS
## Plataforma de Redes Semánticas Naturales (RSN)

Este documento detalla formalmente los tipos de datos, estructuras de entrada/salida, algoritmos paso a paso, manejo riguroso de casos borde (*edge cases*) y esquemas de normalización implementados en el motor de cálculo.

---

## 1. Estructuras de Datos Primarias

### 1.1. Registro de Participación Individual
Para cada participante $i \in \{1, \dots, N\}$ y estímulo $e \in E$:
$$R_{i, e} = \langle \text{id}_i, \text{timestamp}_i, \text{duration}_i, [(w_{i,1}, t_{i,1}), (w_{i,2}, t_{i,2}), \dots, (w_{i, m_i}, t_{i, m_i})], \pi_i \rangle$$
donde:
* $m_i \in \{1, \dots, K_{\max}\}$ es el número de asociaciones producidas ($K_{\max} = 10$ por defecto).
* $w_{i, k}$ es la cadena léxica original producida en el orden de llegada $k$.
* $t_{i, k}$ es el tiempo transcurrido (en ms) desde la presentación del estímulo hasta la confirmación de la palabra $k$.
* $\pi_i: \{1, \dots, m_i\} \to \{1, \dots, m_i\}$ es la biyección que define la jerarquía asignada a cada palabra:
  $r_{i, j} = \pi_i(j) \in \{1, \dots, m_i\}$ sin empates.

---

## 2. Algoritmos de la Tradición Clásica y Modificada (RSN)

### 2.1. Algoritmo de Normalización Léxica en Dos Capas
Para garantizar el principio fundamental de no destrucción de datos:
1. **Capa 0 (Dato Bruto):** $w_{\text{raw}}$ se almacena intacto en la base de datos (preservando acentos, mayúsculas, espacios y caracteres tipeados).
2. **Capa 1 (Normalización Técnica Automática):**
   * Remoción de espacios en blanco marginales (`trim()`).
   * Reducción de espacios intermedios múltiples a un espacio simple.
   * Conversión a minúsculas estándar Unicode (`toLocaleLowerCase('es')`).
   * Normalización canónica de caracteres acentuados (`NFC` de Unicode).
3. **Capa 2 (Normalización Semántica Supervisada):**
   * Consulta al diccionario del proyecto: $\text{Canon}(w) = \text{Dict}[w] \text{ si existe, else } w$.
   * Toda sustitución queda auditada con identificador de regla y autor.

---

### 2.2. Algoritmo de Ponderación Semántica (Valor M) y Manejo de Listas Cortas
Sea $m_i \le K_{\max}$ el número de palabras generadas por el sujeto $i$. La aplicación ofrece dos esquemas formalmente etiquetados:

#### Esquema Canónico A (Reyes Lagunes, 1993; Valdez Medina, 2005) - *Por Defecto*
El rango $r \in \{1, \dots, m_i\}$ asignado por el sujeto conserva el valor semántico absoluto de la posición en la escala de 10 puntos:
$$VS(r) = 11 - r \quad \forall r \in \{1, \dots, 10\}$$
* Ejemplo: Si un sujeto solo escribe 3 palabras y las ordena 1, 2, 3: reciben 10, 9 y 8 puntos respectivamente.
* Fundamento: El participante asignó la máxima prioridad (10 puntos) a su concepto más importante, reflejando su cercanía semántica respecto al nodo central.

#### Esquema Proporcional B (Variante Normalizada por Producción Individual)
El peso se escala en función del número real de respuestas del sujeto:
$$VS_B(r, m_i) = \left( \frac{m_i + 1 - r}{m_i} \right) \times 10$$
* Ambas variantes se configuran en el proyecto; los resultados siempre reportan explícitamente cuál esquema fue aplicado.

---

### 2.3. Algoritmo de Detección Automática del Núcleo de la Red (*Scree Test* de Cattell)
Para evitar cortes arbitrarios de 10 palabras, se implementa el algoritmo determinístico de detección de codo / punto de quiebre sobre la serie ordenada de pesos semánticos $M_{(1)} \ge M_{(2)} \ge \dots \ge M_{(J)}$:

1. **Paso 1: Cálculo de Primeras y Segundas Diferencias:**
   $$\Delta M_i = M_{(i)} - M_{(i+1)} \quad (i = 1, \dots, J-1)$$
   $$\Delta^2 M_i = \Delta M_i - \Delta M_{i+1} \quad (i = 1, \dots, J-2)$$
2. **Paso 2: Algoritmo de Distancia Perpendicular a la Cuerda Secante (Kneedle Algorithm modificado):**
   * Se traza la recta secante $L$ entre el punto $(1, M_{(1)})$ y el punto final $(J, M_{(J)})$.
   * Para cada punto $(i, M_{(i)})$, se calcula la distancia ortogonal a la recta:
     $$d(i) = \frac{|(M_{(J)} - M_{(1)}) i - (J - 1) M_{(i)} + J M_{(1)} - M_{(J)}|}{\sqrt{(M_{(J)} - M_{(1)})^2 + (J - 1)^2}}$$
   * El codo principal $i^*$ es el punto que maximiza la distancia:
     $$i^* = \arg\max_{1 < i < J} d(i)$$
3. **Paso 3: Verificación Asintótica:**
   * Se verifica que la pendiente posterior $\frac{M_{(i^*)} - M_{(J)}}{J - i^*} < \theta \times \frac{M_{(1)} - M_{(i^*)}}{i^* - 1}$ con umbral $\theta = 0.25$.
   * Si la red tiene $J \le 5$, el núcleo abarca la totalidad de las definidoras ($NR = V$).
4. **Variante Manual / Umbral de FMG:**
   * La interfaz permite al investigador alternar entre el corte algorítmico de codo, el conjunto SAM tradicional ($k=10$), o un umbral porcentual preestablecido de FMG (ej. $FMG \ge 20\%$).

---

### 2.4. Resolución Canónica de Empates
En caso de definidoras $A$ y $B$ con idéntico valor M ($M(A) = M(B)$):
1. Criterio 1: Mayor frecuencia en jerarquía 1 ($f(A, 1) > f(B, 1)$).
2. Criterio 2: Mayor frecuencia en jerarquías subsecuentes ($r=2, \dots, 10$).
3. Criterio 3: Mayor frecuencia absoluta total ($f(A) > f(B)$).
4. Criterio 4: Si persiste el empate en el límite del conjunto SAM o Núcleo, ambas palabras son incluidas en el subconjunto, incrementando el cardinal para no truncar información arbitrariamente (Valdez Medina, 2005, p. 74).

---

## 3. Algoritmos del Enfoque Contemporáneo (Teoría de Grafos)

### 3.1. Construcción de Matrices de Coocurrencia
Dada la matriz de respuesta binaria $X \in \{0, 1\}^{N \times V}$:
1. Para cada par de definidoras $(j, k)$ con $j < k$:
   $$C_{jk} = \sum_{i=1}^N X_{ij} X_{ik}$$
   Propiedad: $C_{jk} \le \min(f(j), f(k))$.
2. **Control de duplicados intrasujeto:** Como $X_{ij} \in \{0, 1\}$, si un participante escribiera por error técnico una palabra duplicada, solo se computa 1 sola presencia, garantizando que $C_{jk}$ represente exactamente el número de participantes concurrentes.

---

### 3.2. Métricas de Similitud de Aristas
La aplicación implementa 3 opciones documentadas:
1. **Frecuencia Absoluta de Coocurrencia:** $w_{jk} = C_{jk}$.
2. **Índice de Jaccard:**
   $$w_{jk}^{\text{Jaccard}} = \frac{C_{jk}}{f(j) + f(k) - C_{jk}}$$
3. **Información Mutua Puntual Positiva Normalizada (NPMI):**
   $$\text{PMI}(j, k) = \ln \left( \frac{p(j, k)}{p(j) p(k)} \right) = \ln \left( \frac{C_{jk} \cdot N}{f(j) f(k)} \right)$$
   $$\text{NPMI}(j, k) = \frac{\text{PMI}(j, k)}{-\ln(C_{jk} / N)}$$
   Tratamiento: Si $C_{jk} = 0$, $w_{jk} = 0$.

---

### 3.3. Algoritmos de Centralidad y Manejo de Componentes Desconectados
1. **Centralidad de Grado ($C_D$):**
   $$C_D(i) = \frac{\sum_{j \neq i} \mathbb{I}(w_{ij} > \tau)}{V - 1}$$
2. **Fuerza Nodal Ponderada ($s_i$):**
   $$s_i = \sum_{j \neq i} w_{ij}$$
3. **Caminos Más Cortos (Dijkstra) y Distancia en Grafos Ponderados:**
   Para grafos ponderados donde mayor similitud implica mayor cercanía conceptual, la distancia de arista se transforma como:
   $$d_{edge}(j, k) = \frac{1}{w_{jk}} \quad \text{o} \quad d_{edge}(j, k) = 1 - w_{jk}^{\text{Jaccard}}$$
4. **Manejo de Componentes Desconectados en ASPL:**
   Si la red contiene más de un componente conectado ($c > 1$):
   * Se identifica el Componente Conectado Gigante (LCC, *Largest Connected Component*).
   * Se calcula y reporta el ASPL sobre el LCC, documentando explícitamente:
     $$L_{\text{LCC}} = \frac{1}{|V_{\text{LCC}}|(|V_{\text{LCC}}| - 1)} \sum_{u \neq v \in V_{\text{LCC}}} d(u, v)$$
   * Se reporta el porcentaje de nodos contenidos en el LCC: $\% V_{\text{LCC}} = \frac{|V_{\text{LCC}}|}{V} \times 100$.
   * Como métrica armónica global sobre todos los nodos (Newman, 2003):
     $$L_{\text{harmonic}}^{-1} = \frac{1}{V(V - 1)} \sum_{u \neq v} \frac{1}{d(u, v)}$$
     asignando $\frac{1}{\infty} = 0$ para pares desconectados.

---

### 3.4. Detección de Comunidades (Algoritmo Louvain)
Para maximizar la modularidad de Newman:
$$Q = \frac{1}{2m} \sum_{i, j} \left[ A_{ij} - \frac{k_i k_j}{2m} \right] \delta(c_i, c_j)$$
1. **Fase 1:** Cada nodo inicia en su propia comunidad. Para cada nodo $i$, se evalúa la ganancia de modularidad $\Delta Q$ al moverlo a la comunidad de cada uno de sus vecinos. Se reasigna al clúster de máxima ganancia positiva. Se repite iterativamente hasta convergencia local.
2. **Fase 2:** Se construye una nueva red donde los nodos son las comunidades de la Fase 1. Se repite el proceso hasta que no haya incremento de modularidad.

---

## 4. Métodos Estadísticos de Comparación de Redes

### 4.1. Coeficiente de Correlación de Perfiles Semánticos (Pearson $r$)
Para comparar dos grupos $A$ y $B$ sobre las definidoras del universo común $V_A \cup V_B$:
$$r_{AB} = \frac{\sum_{j \in V_{\cup}} (M_A(j) - \bar{M}_A)(M_B(j) - \bar{M}_B)}{\sqrt{\sum (M_A(j) - \bar{M}_A)^2 \sum (M_B(j) - \bar{M}_B)^2}}$$
donde $M_G(j) = 0$ si la palabra $j$ no fue mencionada por el grupo $G$.

### 4.2. Prueba de Chi-Cuadrada de Tamaños de Red ($\chi^2$)
Para comparar la producción de definidoras entre dos grupos respecto al volumen de participantes:
$$\chi^2 = \sum \frac{(O - E)^2}{E}$$
contrastando frecuencias observadas de palabras compartidas y exclusivas.

---

## 5. Simulación Conexionista y Redes Pathfinder (PFNET)

### 5.1. Modelo Probabilístico de Asociación de Rumelhart
Basado en Rumelhart et al. (1986) y Sánchez Miranda et al. (2013, p. 224):
Para cada par de conceptos $x_i, x_j \in V$, se calcula la tabla de contingencia $2 \times 2$ con frecuencias suavizadas $n_{ab}^* = n_{ab} + \epsilon$ ($\epsilon = 0.5$ por defecto):
- $P_{11} = n_{11}^* / N^*$
- $P_{10} = n_{10}^* / N^*$
- $P_{01} = n_{01}^* / N^*$
- $P_{00} = n_{00}^* / N^*$

El peso de asociación conexionista es el Log-Odds Ratio:
$$w_{ij} = \ln\left( \frac{P_{11} P_{00}}{P_{10} P_{01}} \right)$$

### 5.2. Conversión a Distancias Métricas
$$d_{ij} = \begin{cases} 0 & \text{si } i = j \\ \frac{1}{w_{ij}} & \text{si } w_{ij} > \tau \\ \infty & \text{si } w_{ij} \le \tau \end{cases}$$
con umbral predeterminado $\tau = 0.0001$.

### 5.3. Algoritmo Pathfinder (Schvaneveldt, 1990)
Dada la matriz de distancias $D$ con $d_{ij} \in [0, \infty]$, los parámetros son:
- $r \in [1, \infty]$: parámetro de la métrica de Minkowski.
  Para un camino $P = (v_0, v_1, \dots, v_k)$, su longitud es:
  $$L(P) = \left( \sum_{m=1}^k d(v_{m-1}, v_m)^r \right)^{1/r}$$
  Para $r = \infty$:
  $$L(P) = \max_{1 \le m \le k} d(v_{m-1}, v_m)$$
- $q \in \{1, 2, \dots, V - 1\}$: número máximo de enlaces en caminos alternativos.

**Regla de decisión Pathfinder:**
Una arista directa $(i, j)$ con $d_{ij} < \infty$ pertenece a la red $PFNET(r, q)$ si y solo si:
$$d_{ij} \le \min_{\substack{P \in \text{Paths}(i, j) \\ 2 \le |P| \le q}} L(P)$$
Si existe cualquier ruta alternativa de longitud $\le q$ con menor distancia, la arista directa $(i, j)$ es redundante y se elimina.

### 5.4. Índice de Similaridad Estructural (ISE)
Para comparar dos redes semánticas $A$ y $B$ (Sánchez et al., 2013, p. 227):
$$ISE_{\text{global}} = \frac{|E_A \cap E_B|}{|E_A \cup E_B|}$$
Y a nivel individual para cada concepto $v$:
$$ISE(v) = \frac{|\text{Vecinos}_A(v) \cap \text{Vecinos}_B(v)|}{|\text{Vecinos}_A(v) \cup \text{Vecinos}_B(v)|}$$
con rango $ISE \in [0, 1]$.

