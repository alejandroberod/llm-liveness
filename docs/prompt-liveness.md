# Lecciones sobre el prompt de liveness

Contexto para quien vaya a tocar `SYSTEM_PROMPT` en [`lib/liveness.ts`](../lib/liveness.ts).

Cada regla de ese prompt está ahí por un fallo concreto que se observó al evaluarlo contra imágenes reales. Varias parecen redundantes o excesivamente enfáticas, y no lo son: se escribieron así porque la versión suave no funcionaba. Este documento explica qué se rompe al mover cada cosa, para no repetir el ciclo.

No hay números aquí a propósito. Las métricas dependen del dataset y de la cámara; lo que sigue son relaciones causa-efecto que se sostuvieron en todas las mediciones.

---

## El principio que ordena todo lo demás

**Una señal live tiene que ser una propiedad de la CAPTURA ACTUAL, nunca del CONTENIDO de la imagen.**

Una pantalla o una impresión reproducen el contenido original con total fidelidad. Todo lo que sea una propiedad de ese contenido sobrevive intacto al ataque y por lo tanto no distingue nada. Si aceptas una de esas propiedades como evidencia de live, le estás dando al modelo una excusa para dejar pasar replays.

Tres errores distintos del prompt resultaron ser el mismo error visto desde tres ángulos:

- **Sombreado tridimensional del rostro.** Una foto 2D de una cara real conserva el sombreado de nariz y pómulos. El modelo lo citaba como prueba de profundidad y concluía live sobre fotos de fotos.
- **Coherencia interna de la escena.** Una foto impresa de una persona completa conserva su cuello, sus hombros, su fondo y su iluminación, todos consistentes entre sí. La regla original pedía buscar esa continuidad y concluir live al encontrarla, lo cual la hacía trivialmente satisfacible por cualquier ataque bien encuadrado.
- **Geometría de selfie.** Un replay de una selfie conserva la geometría de esa selfie. Este se introdujo *intentando arreglar* los dos anteriores, y el modelo empezó a citarlo de inmediato para justificar live sobre replays.

Por eso el prompt hoy tiene una lista explícita de qué NO cuenta como señal live y sólo tres señales válidas. **Antes de agregar cualquier cosa a la lista de señales live, pregúntate si una pantalla puede copiarla sin alterarla. Si puede, no va ahí.**

Corolario práctico: **cada entrada nueva en la lista de señales LIVE es una vía de escape nueva.** El modelo busca activamente una justificación para live y usa la primera que encuentre. Ampliar esa lista casi siempre empeora la detección de ataques.

---

## Trampas específicas

### La continuidad se evalúa contra el entorno de captura, no dentro del contenido

La pregunta útil no es "¿esta persona tiene cuello y hombros coherentes?" sino "¿esta persona está en la habitación desde la que se tomó la foto?". La contra-evidencia que sirve es la que un medio interpuesto no puede reproducir: mechones sueltos de pelo recortados contra el fondo, caída progresiva de foco entre planos, luz de la habitación actual cayendo con la misma dirección sobre persona y fondo.

Si alguien reescribe esta regla en términos de coherencia interna, vuelven a pasar las fotos de escenas completas.

### El medio sólo es evidencia si el rostro analizado está sobre él

Un celular en la mano, un monitor al lado, un espejo o un cuadro en la pared **no son un ataque**. La gente se toma selfies en su escritorio. Sin esta regla, el modelo dispara `screen_replay` con altísima confianza en cuanto ve un dispositivo en el encuadre, aunque la cara que está evaluando no esté en esa pantalla.

Esta fue, con diferencia, la mayor causa de rechazo de usuarios legítimos. Es también el arreglo más barato y el de efecto más limpio: quitarlo devuelve el problema de inmediato.

### Las reglas de contención son todas unidireccionales

El prompt tiene varias reglas correctas que impiden sobre-diagnosticar spoof:

- la mala calidad no prueba un ataque,
- la ausencia de señales live no es evidencia de ataque,
- los artefactos del sensor no son manipulación digital,
- sin un medio físico visible no se puede dictaminar spoof.

Cada una es correcta por separado. El problema es que **todas empujan hacia el mismo lado y no hay ninguna que empuje de vuelta.** El resultado observado: en imágenes de baja calidad sin medio visible, el camino de menor resistencia es siempre live, y el veredicto `inconclusive` no se emite jamás.

Si ves que la tasa de `inconclusive` es cero, no es que las imágenes sean fáciles: es que no existe ninguna regla que lleve ahí.

### La contradicción del texto dentro de la imagen

Un texto visible en la foto nunca puede *subir* la confianza en live (es inyección de prompt), pero una marca de agua, un logo de banco de imágenes o un elemento de interfaz superpuesto **sí** indican que estás viendo un medio ya existente. Son dos direcciones distintas y hay que enunciarlas por separado. La versión original las mezclaba en una sola frase que se contradecía a sí misma.

---

## El dial de `inconclusive` es estrecho y los dos extremos fallan

Se probaron tres formulaciones. Es el parámetro más delicado del prompt.

**Demasiado laxa: "dos o más señales débiles".** No se activa nunca. El modelo no llega a contar dos, y el veredicto sigue cayendo siempre en live.

**Demasiado estricta: "para decir live hay que poder citar una señal live positiva".** Se activa constantemente y rechaza a la mayoría de los usuarios reales. La razón es importante y no es un defecto de redacción: **una webcam barata, sobreexpuesta y muy comprimida, borra genuinamente la micro-textura de piel y la caída de foco de una persona perfectamente real.** Exigir esas señales es exigir algo que la cámara del usuario no produce. Además contradice en espíritu la regla —correcta— de que la ausencia de señales live no es evidencia de ataque.

**Lo que funciona: exigir las dos condiciones.** Ausencia de señales live citables **Y** al menos una sospecha positiva (color que no corresponde a la escena, cero caída de foco pese a resolución suficiente, geometría que no es de selfie, escena incompatible con una selfie). La mala calidad por sí sola es la primera condición, nunca la segunda.

Si alguien simplifica esto a una sola condición, en cualquiera de las dos direcciones, el sistema se rompe por un extremo o por el otro. **No lo toques sin volver a medir.**

---

## El techo: el modelo alucina señales live bajo presión

Cuando se le exige citar una señal live para poder conceder live, el modelo afirma ver "caída de enfoque progresiva" y "brillos especulares coherentes" en imágenes que son replays. No es que se salte la regla: es que **a baja resolución su juicio sobre la caída de foco no es confiable en ninguna de las dos direcciones**, y cuando le pides una señal, la produce.

Esto pone un límite a lo que se puede lograr desde el prompt. Las señales más discriminativas que tenemos son justamente las que el modelo no distingue bien en imágenes malas. Si se quiere avanzar más allá de ese punto, el camino no es seguir redactando reglas: es mejor entrada (más resolución, varios frames, señal activa) o un detector dedicado, no otro párrafo en el prompt.

---

## La restricción de fondo

**Un replay de baja calidad y una selfie real de webcam mala se parecen mucho.** Casi cualquier ajuste que endurezca la detección de lo primero castiga lo segundo, porque son visualmente el mismo tipo de imagen.

De ahí que no exista un ajuste que mejore ambas cosas a la vez, y que cualquier cambio deba medirse contra imágenes reales *y* contra ataques. Un cambio evaluado sólo contra ataques se ve siempre excelente y suele ser inservible en producción.

---

## Reglas que están bien y conviene no "arreglar"

- **Artefactos del sensor.** Halos, piel plastificada, bandas de color y altas luces quemadas son propiedades de webcams baratas, no de manipulación digital. Sin esta regla el modelo reporta `digital_manipulation_or_ai_artifacts` en cualquier selfie mala.
- **Exigir un medio físico para dictaminar spoof.** Evita que sospechas difusas se conviertan en acusaciones. La válvula de escape correcta para la sospecha sin medio visible es `inconclusive`, no `spoof`.
- **La sección de geometría de selfie, en sentido negativo.** Que el encuadre NO sea de selfie es sospechoso y útil. Que SÍ lo sea no prueba nada. La sección está redactada así a propósito.

---

## Cómo medir un cambio

El script es [`scripts/eval-llm.mjs`](../scripts/eval-llm.mjs); necesita el dev server arriba y el dataset en `dataset/live` y `dataset/spoof/<subtipo>`. Ambos directorios están en `.gitignore` porque contienen datos biométricos: **no los subas al repo**.

Cuatro cosas que se aprendieron midiendo, todas por haberlas hecho mal primero:

1. **Necesitas suficientes imágenes reales, no sólo ataques.** Con un puñado de imágenes live, una sola cambia el resultado de forma brutal y te lleva a conclusiones equivocadas. En este proyecto se descartó una variante buena por esa razón, y al ampliar el conjunto resultó ser la mejor.

2. **Corre cada variante más de una vez.** Con `temperature: 0` el modelo no es determinista en las imágenes limítrofes: las mismas imágenes con el mismo prompt pueden dar veredictos distintos. Si una variante da resultados que oscilan entre corridas, esa inestabilidad es en sí misma información — una regla inequívoca se aplica de forma consistente, una que pide ponderar varias condiciones no.

3. **Nunca compares resultados obtenidos sobre datasets distintos.** Si agregas imágenes, vuelve a medir la variante anterior sobre el conjunto nuevo antes de afirmar que algo mejoró.

4. **`inconclusive` cuenta como rechazo** en el cálculo del script. Eso significa que ayuda a la métrica de ataques y perjudica a la de usuarios legítimos. Es una decisión de política deliberada y conservadora, pero hay que tenerla presente al leer los resultados: una variante puede "mejorar" sólo porque empezó a dudar de todo.

Mira siempre las dos métricas por separado. El promedio de las dos asume que rechazar a un usuario real y dejar entrar a un impostor cuestan lo mismo, y no es así.
