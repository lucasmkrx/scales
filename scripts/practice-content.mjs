// The three translations open the same playable setups. Handedness follows the player’s saved preference.
const guitar = { instrument: 'guitar', strings: 6, tuning: 'guitar-standard' };
const bass = { instrument: 'bass', strings: 4, tuning: 'bass-4-standard' };
const aMinorPentatonic = { ...guitar, root: 9, scale: 'minor-pentatonic' };
const cMajor = { ...bass, root: 0, scale: 'major' };
const aDorian = { ...guitar, root: 9, scale: 'dorian' };

export const practiceContent = {
  en: {
    linkLabel: 'Scale practice guide',
    title: 'How to practice guitar and bass scales',
    description:
      'Play A minor pentatonic on guitar, trace C major across three bass strings, and hear the major sixth in A Dorian. Open each exercise on an interactive fretboard.',
    intro:
      'Tune your instrument to E standard for these exercises. Play each phrase, then tap the same notes on the diagram to check what you heard.',
    exerciseHeading: 'Three fretboard exercises',
    referenceLink: 'Explore scale formulas and intervals',
    questionHeading: 'Reading and using the fretboard',
    backToExplorer: 'Open the fretboard explorer',
    downloadsHeading: 'Printable guitar and bass guides',
    byline: 'By Lucas Marques',
    exercises: [
      {
        ...aMinorPentatonic,
        title: 'Play A minor pentatonic on guitar',
        body: 'The five notes are A, C, D, E, and G. Play frets 5 and 8 on the low E string, 5 and 7 on the A string, then 5 and 7 on the D string. You’ve gone from A to A in one octave. Play back down, then use just three of the notes to make a phrase that ends on A.',
        action: 'Open A minor pentatonic on guitar',
      },
      {
        ...cMajor,
        title: 'Play one octave of C major on bass',
        body: 'On a four-string bass tuned E–A–D–G, start on the A string at fret 3. Play frets 3 and 5 on that string, 2, 3, and 5 on the D string, and 2, 4, and 5 on the G string. You’ll hear C, D, E, F, G, A, B, C. Now play only C, E, and G to hear the chord tones of a C major triad.',
        action: 'Open C major on bass',
      },
      {
        ...aDorian,
        title: 'Hear the major sixth in A Dorian',
        body: 'A Dorian contains A, B, C, D, E, F♯, and G. On the high E string, alternate F at fret 1 and F♯ at fret 2 over an A minor chord. F belongs to A natural minor. F♯ is the major sixth that gives A Dorian its color. Choose Funk under Backing tracks and select Search YouTube. Start an A Dorian groove in the new tab and play the phrase again.',
        action: 'Open A Dorian on guitar',
      },
    ],
    questions: [
      {
        question: 'How do I read the dots and rings?',
        answer:
          'Each horizontal line is a string. Fret 0 is the open string. A dot marks a note you can play, and a ring marks the root of the selected scale. Tap a note to hear its pitch. Switch to Degrees to see its interval from the root. In A minor pentatonic, A is 1, C is ♭3, and E is 5.',
      },
      {
        question: 'Why do the patterns change when I retune?',
        answer:
          'Changing the pitch of an open string moves the scale notes on that string. Tukany recalculates the note map for your tuning. Choose Full neck to see patterns that extend past fret 12. If the tuning or scale has no supported fingering pattern, you can still practice from the individual notes.',
      },
      {
        question: 'How can I share or print a left-handed scale diagram?',
        answer:
          'Choose Left-handed in the instrument settings. Copy link below the fretboard shares that orientation along with the tuning, root, and scale. For a printed reference, choose Selected scale in the PDF section and select Download PDF.',
      },
    ],
  },
  pt: {
    linkLabel: 'Guia de prática de escalas',
    title: 'Como praticar escalas na guitarra e no baixo',
    description:
      'Toque a pentatônica menor de lá na guitarra, percorra a escala de dó maior em três cordas do baixo e ouça a sexta maior do modo dórico de lá no braço interativo.',
    intro:
      'Use a afinação padrão em mi. No diagrama, as notas aparecem com letras (A = lá, C = dó). Toque cada frase no seu instrumento e confira o som tocando nas notas do diagrama.',
    exerciseHeading: 'Três exercícios para explorar o braço',
    referenceLink: 'Consultar fórmulas e intervalos das escalas',
    questionHeading: 'Como ler e usar o diagrama',
    backToExplorer: 'Abrir o braço interativo',
    downloadsHeading: 'Guias de guitarra e baixo para imprimir',
    byline: 'Por Lucas Marques',
    exercises: [
      {
        ...aMinorPentatonic,
        title: 'Toque a pentatônica menor de lá na guitarra',
        body: 'As cinco notas são lá, dó, ré, mi e sol. Toque as casas 5 e 8 na corda mi grave, 5 e 7 na corda lá e 5 e 7 na corda ré. Você saiu de um lá e chegou ao lá da oitava seguinte. Faça o caminho de volta e use só três dessas notas para criar uma frase que termine em lá.',
        action: 'Abrir a pentatônica menor de lá na guitarra',
      },
      {
        ...cMajor,
        title: 'Toque uma oitava de dó maior no baixo',
        body: 'No baixo de quatro cordas afinado em mi–lá–ré–sol, comece na casa 3 da corda lá. Toque as casas 3 e 5 nessa corda, 2, 3 e 5 na corda ré e 2, 4 e 5 na corda sol. A sequência é dó, ré, mi, fá, sol, lá, si, dó. Depois, toque só dó, mi e sol para ouvir as notas da tríade de dó maior.',
        action: 'Abrir dó maior no baixo',
      },
      {
        ...aDorian,
        title: 'Ouça a sexta maior no modo dórico de lá',
        body: 'As notas do modo dórico de lá são lá, si, dó, ré, mi, fá♯ e sol. Na corda mi aguda, alterne entre o fá da casa 1 e o fá♯ da casa 2 sobre um acorde de lá menor. O fá faz parte da escala menor natural de lá. O fá♯ é a sexta maior que dá ao modo dórico seu som característico. Em Faixas de acompanhamento, escolha Funk e selecione Buscar no YouTube. Na nova aba, coloque uma base em lá dórico para tocar e repita a frase na guitarra.',
        action: 'Abrir lá dórico na guitarra',
      },
    ],
    questions: [
      {
        question: 'Como ler os pontos e os círculos no diagrama?',
        answer:
          'Cada linha horizontal representa uma corda. A casa 0 indica a corda solta. Os pontos indicam as notas que você pode tocar. Um círculo em volta do ponto marca a tônica da escala. Toque em uma nota para ouvi-la. A opção Graus mostra o intervalo em relação à tônica. Na pentatônica menor de lá, lá é 1, dó é ♭3 e mi é 5.',
      },
      {
        question: 'Por que os desenhos mudam quando altero a afinação?',
        answer:
          'Mudar a afinação de uma corda muda a posição das notas da escala nessa corda. O Tukany recalcula o diagrama para a sua afinação. Escolha Braço inteiro para ver os desenhos que passam da casa 12. Quando não há um desenho disponível para a escala ou afinação, você ainda pode praticar pelas notas do diagrama.',
      },
      {
        question: 'Como compartilhar ou imprimir o diagrama para canhotos?',
        answer:
          'Escolha Canhoto nas opções do instrumento. O botão Copiar link, abaixo do diagrama, inclui no link a orientação, a afinação, a tônica e a escala. Para imprimir, escolha a escala selecionada na seção PDF e toque em Baixar PDF.',
      },
    ],
  },
  es: {
    linkLabel: 'Guía para practicar escalas',
    title: 'Cómo practicar escalas en guitarra y bajo',
    description:
      'Practica la pentatónica menor de la en guitarra, toca do mayor en tres cuerdas del bajo y escucha el modo dórico de la con un diapasón interactivo.',
    intro:
      'Usa la afinación estándar en mi. El diagrama muestra las notas con letras (A = la, C = do). Toca cada frase en tu instrumento y luego pulsa las mismas notas en el diagrama para comparar cómo suenan.',
    exerciseHeading: 'Tres ejercicios en el diapasón',
    referenceLink: 'Consultar las fórmulas y los intervalos de las escalas',
    questionHeading: 'Cómo leer y usar el diapasón',
    backToExplorer: 'Abrir el diapasón interactivo',
    downloadsHeading: 'Guías de guitarra y bajo para imprimir',
    byline: 'Por Lucas Marques',
    exercises: [
      {
        ...aMinorPentatonic,
        title: 'Toca la pentatónica menor de la en guitarra',
        body: 'Las cinco notas son la, do, re, mi y sol. Toca los trastes 5 y 8 en la cuerda mi grave, 5 y 7 en la cuerda la, y 5 y 7 en la cuerda re. La última nota es la, una octava más alta que la primera. Vuelve por el mismo camino y crea una frase de tres notas que termine en la.',
        action: 'Abrir la pentatónica menor de la en guitarra',
      },
      {
        ...cMajor,
        title: 'Toca una octava de do mayor en el bajo',
        body: 'En un bajo de cuatro cuerdas afinado en mi–la–re–sol, empieza en el traste 3 de la cuerda la. Toca los trastes 3 y 5 en esa cuerda, 2, 3 y 5 en la cuerda re, y 2, 4 y 5 en la cuerda sol. Escucharás do, re, mi, fa, sol, la, si, do. Después, toca solo do, mi y sol para oír las notas de la tríada de do mayor.',
        action: 'Abrir do mayor en el bajo',
      },
      {
        ...aDorian,
        title: 'Escucha la sexta mayor en el modo dórico de la',
        body: 'Las notas del modo dórico de la son la, si, do, re, mi, fa♯ y sol. Sobre un acorde de la menor, alterna entre fa en el traste 1 de la cuerda mi aguda y fa♯ en el traste 2. El fa pertenece a la escala menor natural de la. El fa♯ es la sexta mayor que le da al modo dórico su sonido característico. En Pistas de acompañamiento, elige Funk y selecciona Buscar en YouTube. Reproduce una pista en la dórico en la nueva pestaña y vuelve a tocar la frase en la guitarra.',
        action: 'Abrir el modo dórico de la en guitarra',
      },
    ],
    questions: [
      {
        question: '¿Qué significan los puntos y los círculos?',
        answer:
          'Cada línea horizontal representa una cuerda. El traste 0 corresponde a la cuerda al aire. Los puntos indican notas que puedes tocar. Un círculo alrededor de un punto marca la tónica de la escala. Pulsa una nota para escucharla. Elige Grados para ver su intervalo respecto a la tónica. En la pentatónica menor de la, la es 1, do es ♭3 y mi es 5.',
      },
      {
        question: '¿Por qué cambian los patrones cuando cambio la afinación?',
        answer:
          'Al cambiar la afinación de una cuerda, las notas de la escala cambian de traste en esa cuerda. Tukany recalcula el diagrama con la nueva afinación. Elige Diapasón completo para ver los patrones que sobrepasan el traste 12. Si no hay un patrón disponible para la escala o la afinación, puedes practicar con las notas individuales del diagrama.',
      },
      {
        question: '¿Cómo comparto o imprimo un diagrama para zurdos?',
        answer:
          'Elige Zurdo en los ajustes del instrumento. El botón Copiar enlace, debajo del diapasón, comparte la orientación, la afinación, la tónica y la escala. Para imprimir, elige la escala seleccionada en la sección PDF y pulsa Descargar PDF.',
      },
    ],
  },
};
