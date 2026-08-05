(function () {
  const schoolYears = [
    { code: '1EF', label: '1º ano do Ensino Fundamental', short: '1º ano', stage: 'Fundamental', band: 'early', order: 1 },
    { code: '2EF', label: '2º ano do Ensino Fundamental', short: '2º ano', stage: 'Fundamental', band: 'early', order: 2 },
    { code: '3EF', label: '3º ano do Ensino Fundamental', short: '3º ano', stage: 'Fundamental', band: 'primary', order: 3 },
    { code: '4EF', label: '4º ano do Ensino Fundamental', short: '4º ano', stage: 'Fundamental', band: 'primary', order: 4 },
    { code: '5EF', label: '5º ano do Ensino Fundamental', short: '5º ano', stage: 'Fundamental', band: 'primary', order: 5 },
    { code: '6EF', label: '6º ano do Ensino Fundamental', short: '6º ano', stage: 'Fundamental', band: 'final', order: 6 },
    { code: '7EF', label: '7º ano do Ensino Fundamental', short: '7º ano', stage: 'Fundamental', band: 'final', order: 7 },
    { code: '8EF', label: '8º ano do Ensino Fundamental', short: '8º ano', stage: 'Fundamental', band: 'final', order: 8 },
    { code: '9EF', label: '9º ano do Ensino Fundamental', short: '9º ano', stage: 'Fundamental', band: 'final', order: 9 },
    { code: '1EM', label: '1ª série do Ensino Médio', short: '1ª série', stage: 'Médio', band: 'high', order: 10 },
    { code: '2EM', label: '2ª série do Ensino Médio', short: '2ª série', stage: 'Médio', band: 'high', order: 11 },
    { code: '3EM', label: '3ª série do Ensino Médio', short: '3ª série', stage: 'Médio', band: 'high', order: 12 }
  ];

  const item = (q, a, correct, skill, note) => ({ q, a, correct, skill, note });

  const banks = {
    Matemática: {
      early: [
        item('Lia tinha 8 figurinhas e ganhou mais 5. Com quantas figurinhas ela ficou?', ['10', '11', '12', '13', '14'], 3, 'Somar quantidades', 'Juntamos as duas quantidades: 8 + 5 = 13.'),
        item('Observe a sequência: 2, 4, 6, 8, __. Qual número completa a sequência?', ['9', '10', '11', '12', '14'], 1, 'Reconhecer sequência numérica', 'A sequência aumenta de 2 em 2; depois de 8 vem 10.'),
        item('O número 47 é formado por:', ['4 dezenas e 7 unidades', '7 dezenas e 4 unidades', '47 dezenas', '4 unidades e 7 centenas', '7 unidades apenas'], 0, 'Compor números naturais', 'Quarenta e sete corresponde a 4 dezenas e 7 unidades.'),
        item('Uma caixa tem 10 lápis. Três foram usados. Quantos lápis ficaram na caixa?', ['5', '6', '7', '8', '9'], 2, 'Subtrair quantidades', 'Calculamos 10 − 3 = 7.'),
        item('Bia tem uma nota de R$ 10 e compra um suco por R$ 6. Quanto recebe de troco?', ['R$ 2', 'R$ 3', 'R$ 4', 'R$ 5', 'R$ 6'], 2, 'Resolver situação com dinheiro', 'O troco é a diferença: 10 − 6 = 4 reais.')
      ],
      primary: [
        item('Uma escola organizou 6 fileiras com 8 cadeiras em cada uma. Quantas cadeiras foram organizadas?', ['14', '36', '42', '48', '56'], 3, 'Multiplicar números naturais', 'São 6 grupos de 8 cadeiras: 6 × 8 = 48.'),
        item('Setenta e duas bolas serão divididas igualmente entre 9 equipes. Quantas bolas cada equipe receberá?', ['6', '7', '8', '9', '10'], 2, 'Dividir em partes iguais', 'A divisão 72 ÷ 9 resulta em 8.'),
        item('Uma pizza foi dividida em 8 partes iguais e 3 partes foram comidas. Que fração representa a parte comida?', ['3/5', '3/8', '5/8', '8/3', '1/3'], 1, 'Representar frações', 'O denominador indica 8 partes iguais e o numerador indica as 3 partes comidas.'),
        item('Um jardim retangular mede 7 m de comprimento e 4 m de largura. Qual é o seu perímetro?', ['11 m', '18 m', '22 m', '28 m', '32 m'], 2, 'Calcular perímetro', 'Somamos todos os lados: 7 + 4 + 7 + 4 = 22 m.'),
        item('Em uma pesquisa, 12 alunos escolheram futebol, 8 escolheram vôlei e 5 escolheram natação. Quantos alunos participaram?', ['20', '23', '25', '27', '30'], 2, 'Interpretar dados', 'Somamos as três frequências: 12 + 8 + 5 = 25.')
      ],
      final: [
        item('Resolva a equação 3x + 5 = 26.', ['x = 5', 'x = 6', 'x = 7', 'x = 8', 'x = 9'], 2, 'Resolver equação do primeiro grau', 'Subtraindo 5, temos 3x = 21; dividindo por 3, x = 7.'),
        item('Um tênis de R$ 240 recebeu desconto de 15%. Qual foi o valor do desconto?', ['R$ 24', 'R$ 30', 'R$ 36', 'R$ 40', 'R$ 45'], 2, 'Calcular porcentagem', '15% de 240 é 0,15 × 240 = 36.'),
        item('As notas de um estudante foram 6, 8, 10 e 12. Qual é a média aritmética?', ['8', '9', '9,5', '10', '11'], 1, 'Calcular média aritmética', 'A soma é 36 e há 4 notas; 36 ÷ 4 = 9.'),
        item('Um triângulo retângulo tem catetos de 6 cm e 8 cm. Quanto mede a hipotenusa?', ['9 cm', '10 cm', '12 cm', '14 cm', '16 cm'], 1, 'Aplicar o teorema de Pitágoras', 'Pelo teorema: h² = 6² + 8² = 100; portanto, h = 10 cm.'),
        item('Uma urna contém 3 bolas azuis e 7 vermelhas. A probabilidade de retirar uma bola azul é:', ['3/7', '3/10', '7/10', '1/3', '1/10'], 1, 'Calcular probabilidade', 'Há 3 resultados favoráveis em um total de 10 bolas: 3/10.')
      ]
    },
    Português: {
      early: [
        item('Na palavra SAPO, qual é a primeira sílaba?', ['SA', 'SO', 'PA', 'PO', 'AP'], 0, 'Reconhecer sílabas', 'A palavra SAPO é formada pelas sílabas SA e PO.'),
        item('Qual palavra rima com “coração”?', ['janela', 'caderno', 'balão', 'sapato', 'menino'], 2, 'Perceber rimas', 'Coração e balão terminam com sons semelhantes.'),
        item('Leia: “O gato dorme no sofá.” Quem dorme no sofá?', ['O cachorro', 'O gato', 'A menina', 'O pássaro', 'O peixe'], 1, 'Localizar informação explícita', 'A frase informa diretamente que o gato dorme no sofá.'),
        item('Qual é o plural de “bola”?', ['bolas', 'bolões', 'bolaes', 'bolaz', 'bolar'], 0, 'Formar o plural', 'Acrescentamos s: bola → bolas.'),
        item('Qual frase está organizada corretamente?', ['Parque ao foi João.', 'Foi parque João ao.', 'João foi ao parque.', 'Ao João parque foi.', 'Parque João foi o.'], 2, 'Organizar uma frase', '“João foi ao parque” apresenta as palavras em uma ordem que produz sentido.')
      ],
      primary: [
        item('Leia: “A rua ficou molhada, embora não tivesse chovido. Pedro viu o caminhão-pipa se afastando.” Por que a rua estava molhada?', ['Porque nevou', 'Porque o caminhão-pipa passou', 'Porque o rio transbordou', 'Porque Pedro lavou a rua', 'Porque começou a chover'], 1, 'Inferir informação', 'A presença do caminhão-pipa explica a rua molhada mesmo sem chuva.'),
        item('Na frase “As crianças brincaram ontem”, a palavra “ontem” indica:', ['lugar', 'modo', 'tempo', 'personagem', 'objeto'], 2, 'Identificar circunstância de tempo', '“Ontem” informa quando a ação aconteceu.'),
        item('Qual sinal completa a frase “Que surpresa__”?', ['.', ',', ':', '!', '?'], 3, 'Usar pontuação expressiva', 'A exclamação indica surpresa: “Que surpresa!”.'),
        item('Uma receita culinária tem como principal finalidade:', ['contar uma aventura', 'ensinar o preparo de algo', 'dar uma notícia', 'descrever uma pessoa', 'defender uma opinião'], 1, 'Reconhecer finalidade de gênero', 'A receita apresenta ingredientes e instruções para preparar um alimento.'),
        item('Na frase “Marina pegou o livro e o colocou na mochila”, a palavra “o” retoma:', ['Marina', 'livro', 'mochila', 'pegou', 'colocou'], 1, 'Reconhecer retomada pronominal', 'O pronome “o” evita repetir a palavra “livro”.')
      ],
      final: [
        item('Leia: “A cidade ganhou mais ciclovias; por isso, aumentou o número de pessoas que usam bicicleta.” A expressão “por isso” introduz uma ideia de:', ['oposição', 'conclusão ou consequência', 'comparação', 'condição', 'dúvida'], 1, 'Analisar conectivos', '“Por isso” liga o aumento do uso de bicicletas à ampliação das ciclovias como consequência.'),
        item('Em “A lua observava silenciosa a cidade”, ocorre:', ['hipérbole', 'personificação', 'ironia', 'eufemismo', 'antítese'], 1, 'Reconhecer figura de linguagem', 'Atribuir à lua a ação humana de observar é personificação.'),
        item('Qual alternativa apresenta linguagem adequada a um relatório científico?', ['A experiência foi superlegal!', 'Eu acho que deu certo.', 'Os dados indicam aumento de 12% na amostra.', 'Foi tipo uma mudança enorme.', 'Todo mundo sabe o resultado.'], 2, 'Adequar linguagem ao gênero', 'Um relatório pede linguagem objetiva e dados verificáveis.'),
        item('Na oração “Os estudantes organizaram a feira”, o sujeito é:', ['organizaram', 'a feira', 'os estudantes', 'feira', 'organizaram a feira'], 2, 'Identificar o sujeito', 'Quem pratica a ação de organizar são “os estudantes”.'),
        item('Um artigo de opinião se diferencia de uma notícia porque geralmente:', ['apresenta uma tese defendida por argumentos', 'não possui título', 'usa somente imagens', 'elimina qualquer ponto de vista', 'apresenta apenas diálogos'], 0, 'Distinguir gêneros argumentativos', 'O artigo de opinião explicita uma posição e procura sustentá-la com argumentos.')
      ]
    },
    História: {
      early: [
        item('Qual objeto pode ajudar a conhecer a história de uma família?', ['Uma fotografia antiga', 'Um brinquedo ainda não fabricado', 'Uma nuvem', 'Um número sem contexto', 'Uma sombra'], 0, 'Reconhecer fontes de memória', 'Fotografias registram pessoas, lugares e momentos do passado.'),
        item('O que acontece primeiro na rotina da manhã?', ['Voltar da escola', 'Acordar', 'Jantar', 'Dormir à noite', 'Guardar o material depois da aula'], 1, 'Ordenar acontecimentos', 'Acordar inicia a rotina da manhã.'),
        item('Uma entrevista com uma pessoa idosa pode revelar:', ['memórias de outros tempos', 'o futuro com certeza', 'apenas números', 'somente regras de jogos', 'informações sem relação com a comunidade'], 0, 'Valorizar relatos orais', 'Relatos orais são fontes para conhecer experiências vividas.'),
        item('Uma mudança percebida ao comparar fotos antigas e atuais de um bairro pode ser:', ['a construção de novas ruas', 'o desaparecimento do tempo', 'a troca do passado pelo futuro', 'a ausência de moradores em toda cidade', 'a mudança do nome de todas as pessoas'], 0, 'Comparar passado e presente', 'Fotos de épocas diferentes permitem observar transformações no espaço.'),
        item('Festas, receitas e histórias transmitidas entre gerações fazem parte:', ['da memória e da cultura de um grupo', 'apenas do clima', 'somente dos mapas', 'de objetos sem significado', 'apenas do futuro'], 0, 'Reconhecer tradições culturais', 'Práticas transmitidas entre gerações ajudam a formar a cultura de um grupo.')
      ],
      primary: [
        item('Os povos indígenas que viviam no território brasileiro antes de 1500:', ['formavam um único povo com a mesma língua', 'possuíam diferentes línguas e modos de vida', 'não conheciam agricultura', 'viviam apenas no litoral', 'não produziam cultura'], 1, 'Reconhecer diversidade indígena', 'Havia grande diversidade de povos, línguas, conhecimentos e formas de organização.'),
        item('Um prédio antigo preservado por seu valor para a comunidade é exemplo de:', ['patrimônio cultural', 'recurso descartável', 'fenômeno climático', 'produto sem história', 'fronteira natural'], 0, 'Identificar patrimônio cultural', 'O patrimônio preserva referências importantes para a memória coletiva.'),
        item('A presença africana na formação do Brasil pode ser percebida:', ['somente em documentos estrangeiros', 'na música, culinária, língua e religiosidade', 'apenas em nomes de cidades', 'somente na agricultura moderna', 'em nenhuma prática atual'], 1, 'Reconhecer matrizes culturais', 'Diversas práticas brasileiras foram profundamente construídas por povos africanos e afro-brasileiros.'),
        item('Quando famílias migram de uma região para outra, elas:', ['deixam de ter história', 'levam costumes e constroem novas relações', 'apagam a cultura do destino', 'não alteram sua vida', 'vivem sempre isoladas'], 1, 'Analisar migrações', 'Os deslocamentos aproximam experiências e transformam tanto migrantes quanto lugares de destino.'),
        item('Para comparar duas versões sobre um acontecimento histórico, é importante:', ['ver quem produziu cada fonte e em qual contexto', 'escolher sempre a versão mais curta', 'ignorar a data', 'considerar apenas a imagem', 'aceitar a primeira versão'], 0, 'Comparar fontes históricas', 'Autoria, época e intenção ajudam a interpretar diferenças entre fontes.')
      ],
      final: [
        item('Na democracia ateniense antiga, a participação política era limitada porque:', ['todos os habitantes votavam', 'mulheres, estrangeiros e escravizados eram excluídos', 'não havia assembleias', 'os reis tomavam todas as decisões', 'a escrita era proibida'], 1, 'Analisar cidadania antiga', 'A cidadania ateniense abrangia apenas uma parcela dos homens livres nascidos na cidade.'),
        item('O mercantilismo europeu dos séculos XVI e XVII defendia:', ['livre comércio sem Estados', 'acúmulo de metais e proteção do comércio nacional', 'fim das colônias', 'igualdade econômica imediata', 'proibição da navegação'], 1, 'Compreender práticas mercantilistas', 'Metalismo, balança comercial favorável e intervenção estatal eram princípios mercantilistas.'),
        item('A Revolução Industrial alterou as relações de trabalho ao:', ['eliminar a produção de mercadorias', 'ampliar o trabalho assalariado nas fábricas', 'encerrar a urbanização', 'substituir máquinas por artesanato', 'reduzir a divisão do trabalho'], 1, 'Analisar industrialização', 'A fábrica concentrou trabalhadores assalariados e máquinas, acelerando urbanização e produção.'),
        item('A abolição da escravidão em 1888 não garantiu igualdade social porque:', ['foi acompanhada de ampla reforma agrária', 'a população liberta não recebeu políticas suficientes de inclusão', 'eliminou o racismo imediatamente', 'proibiu o trabalho assalariado', 'devolveu o poder à monarquia'], 1, 'Relacionar abolição e cidadania', 'Sem acesso amplo a terra, educação e trabalho protegido, desigualdades foram mantidas.'),
        item('Durante a Guerra Fria, Estados Unidos e União Soviética:', ['formaram um único governo', 'disputaram influência política, militar e tecnológica', 'aboliram armas nucleares', 'encerraram alianças internacionais', 'não interferiram em outros países'], 1, 'Compreender ordem bipolar', 'As duas potências lideraram blocos rivais e disputaram influência global.')
      ]
    },
    Geografia: {
      early: [
        item('Para indicar onde fica a biblioteca dentro da escola, é mais útil usar:', ['um mapa simples da escola', 'uma receita', 'uma música', 'um calendário', 'uma lista de compras'], 0, 'Representar lugares', 'Um mapa simples mostra a posição dos espaços e ajuda na orientação.'),
        item('Uma paisagem pode mudar quando:', ['uma praça é construída', 'o tempo para de passar', 'as pessoas deixam de observar', 'o Sol desaparece para sempre', 'nenhum elemento se transforma'], 0, 'Perceber transformações da paisagem', 'Construções e ações humanas modificam os elementos visíveis de um lugar.'),
        item('Qual elemento é mais comum em uma área rural?', ['Grandes plantações', 'Muitos prédios altos', 'Metrô subterrâneo', 'Avenida com semáforos', 'Porto de contêineres'], 0, 'Distinguir espaços urbanos e rurais', 'Áreas rurais costumam concentrar atividades agrícolas e pecuárias.'),
        item('Se a padaria fica à direita da escola, para chegar até ela saindo da escola deve-se seguir:', ['para a direita', 'para cima sempre', 'para qualquer lado', 'para a esquerda', 'sem sair do lugar'], 0, 'Usar referência espacial', 'A orientação dada informa diretamente o lado a seguir.'),
        item('Chuva, temperatura e vento são elementos observados para conhecer:', ['o tempo atmosférico', 'a idade de uma rua', 'o preço de um produto', 'a história de uma família', 'o tamanho de uma palavra'], 0, 'Observar o tempo atmosférico', 'Esses elementos descrevem as condições da atmosfera em determinado momento.')
      ],
      primary: [
        item('Em um mapa, a legenda serve para:', ['explicar o significado de cores e símbolos', 'indicar somente o título', 'substituir a escala', 'mostrar apenas o norte', 'esconder informações'], 0, 'Ler mapas', 'A legenda permite interpretar os símbolos usados na representação.'),
        item('As regiões brasileiras foram delimitadas para:', ['agrupar estados com características e relações analisáveis', 'eliminar diferenças culturais', 'mudar as fronteiras nacionais todo ano', 'substituir os municípios', 'impedir deslocamentos'], 0, 'Compreender regionalização', 'Regionalizar ajuda a estudar semelhanças, diferenças e relações entre áreas.'),
        item('A mata ciliar é importante porque:', ['protege as margens dos rios contra erosão', 'aumenta o lixo na água', 'impede toda forma de vida', 'faz o rio desaparecer', 'substitui o tratamento de esgoto'], 0, 'Relacionar vegetação e rios', 'A vegetação das margens reduz erosão e ajuda a conservar os cursos d’água.'),
        item('Uma cidade cresce sem planejamento. Qual problema pode aumentar?', ['Ocupação de áreas de risco', 'Formação de mais florestas nativas', 'Redução automática do trânsito', 'Desaparecimento do lixo', 'Melhora imediata do saneamento'], 0, 'Analisar urbanização', 'Sem planejamento, moradias podem ocupar encostas, margens de rios e outras áreas vulneráveis.'),
        item('A escala de um mapa informa:', ['a relação entre a medida no mapa e a medida real', 'a temperatura do lugar', 'o número de habitantes', 'a idade do território', 'a direção do vento'], 0, 'Interpretar escala cartográfica', 'A escala permite converter distâncias representadas em distâncias reais.')
      ],
      final: [
        item('O êxodo rural corresponde ao deslocamento:', ['da cidade para o campo', 'do campo para a cidade', 'entre países apenas', 'de turistas para praias', 'de mercadorias entre portos'], 1, 'Analisar migração interna', 'Êxodo rural é a saída de população do campo em direção às cidades.'),
        item('Duas cidades estão separadas por 5 cm em um mapa de escala 1:200 000. A distância real é:', ['1 km', '5 km', '10 km', '20 km', '100 km'], 2, 'Calcular escala', 'Cada centímetro representa 2 km; portanto, 5 cm representam 10 km.'),
        item('A globalização produtiva é percebida quando:', ['todas as etapas ocorrem no mesmo bairro', 'uma empresa distribui etapas de produção entre vários países', 'o comércio internacional é encerrado', 'não há circulação de informação', 'as economias ficam isoladas'], 1, 'Compreender redes globais', 'Empresas articulam fornecedores, fábricas e mercados em diferentes territórios.'),
        item('No Brasil, o desmatamento da Amazônia pode alterar o clima de outras regiões porque:', ['a floresta participa da circulação de umidade', 'os rios deixam de correr para o mar', 'a latitude do país muda', 'as montanhas desaparecem', 'o oceano deixa de evaporar'], 0, 'Relacionar biomas e clima', 'A evapotranspiração amazônica contribui para transportar umidade pelo continente.'),
        item('A segregação socioespacial nas cidades se manifesta pela:', ['distribuição desigual de moradia, serviços e infraestrutura', 'igualdade de acesso ao transporte', 'ausência de bairros', 'eliminação das distâncias', 'redução total dos preços da terra'], 0, 'Analisar desigualdade urbana', 'Grupos sociais têm acesso muito diferente a áreas valorizadas, equipamentos e oportunidades.')
      ]
    },
    Biologia: {
      early: [
        item('Qual destes elementos é um ser vivo?', ['Pedra', 'Árvore', 'Copo', 'Cadeira', 'Lápis'], 1, 'Distinguir seres vivos', 'A árvore nasce, cresce, realiza trocas com o ambiente e se reproduz.'),
        item('Para crescer saudável, uma planta geralmente precisa de:', ['água, luz e nutrientes', 'plástico e tinta', 'somente pedras', 'escuro permanente', 'fumaça'], 0, 'Reconhecer necessidades das plantas', 'Água, luz e nutrientes participam do crescimento e da produção de alimento da planta.'),
        item('Qual órgão usamos principalmente para ouvir?', ['Olhos', 'Ouvidos', 'Nariz', 'Pele', 'Língua'], 1, 'Relacionar sentidos e órgãos', 'Os ouvidos captam sons do ambiente.'),
        item('Lavar as mãos antes de comer ajuda a:', ['reduzir a presença de microrganismos', 'aumentar a sujeira', 'substituir a alimentação', 'eliminar a necessidade de água', 'impedir o crescimento'], 0, 'Praticar cuidado com a saúde', 'Água e sabão removem sujeira e muitos microrganismos que podem causar doenças.'),
        item('Em uma cadeia simples, capim → coelho → onça, o coelho se alimenta de:', ['onça', 'capim', 'pedra', 'água apenas', 'outro coelho'], 1, 'Interpretar relação alimentar', 'A seta mostra que o capim serve de alimento para o coelho.')
      ],
      primary: [
        item('Animais vertebrados são aqueles que possuem:', ['coluna vertebral', 'asas obrigatoriamente', 'corpo sem órgãos', 'seis pernas', 'vida apenas aquática'], 0, 'Classificar animais', 'A presença de coluna vertebral caracteriza os vertebrados.'),
        item('Na fotossíntese, as plantas utilizam luz para:', ['produzir matéria orgânica', 'parar de respirar', 'eliminar toda a água', 'transformar folhas em raízes', 'consumir oxigênio apenas'], 0, 'Compreender fotossíntese', 'Com luz, água e gás carbônico, as plantas produzem açúcares e liberam oxigênio.'),
        item('A decomposição de folhas no solo é importante porque:', ['devolve nutrientes ao ambiente', 'impede o ciclo da matéria', 'remove todo o oxigênio', 'transforma o solo em plástico', 'elimina os seres vivos'], 0, 'Compreender decomposição', 'Fungos e bactérias decompõem matéria orgânica e reciclam nutrientes.'),
        item('Qual sistema transporta oxigênio e nutrientes pelo corpo?', ['Digestório', 'Circulatório', 'Nervoso', 'Esquelético', 'Reprodutor'], 1, 'Relacionar sistemas do corpo', 'O sangue circula pelos vasos e distribui gases e nutrientes.'),
        item('Uma forma eficiente de prevenir a dengue é:', ['eliminar recipientes com água parada', 'deixar caixas-d’água abertas', 'acumular pneus no quintal', 'usar antibiótico sem orientação', 'evitar lavar as mãos'], 0, 'Prevenir doenças', 'O mosquito se reproduz em água parada; eliminar criadouros interrompe seu ciclo.')
      ],
      final: [
        item('A membrana plasmática tem como função principal:', ['controlar a entrada e a saída de substâncias', 'produzir toda a energia solar', 'armazenar ossos', 'formar o sangue sozinha', 'substituir o núcleo'], 0, 'Compreender organização celular', 'A membrana delimita a célula e participa do controle de trocas com o meio.'),
        item('Em uma cadeia alimentar, a redução intensa dos predadores tende inicialmente a:', ['aumentar a população de presas', 'eliminar os produtores imediatamente', 'reduzir todas as presas', 'impedir a fotossíntese', 'parar o ciclo da água'], 0, 'Analisar relações ecológicas', 'Com menor predação, mais indivíduos das espécies-presa podem sobreviver e se reproduzir.'),
        item('Genes são segmentos de DNA que:', ['contêm informações hereditárias', 'existem apenas em bactérias', 'substituem todas as proteínas', 'não participam das características', 'são produzidos somente na digestão'], 0, 'Compreender hereditariedade', 'Genes contêm informações usadas na produção de moléculas e na determinação de características.'),
        item('A seleção natural favorece indivíduos que:', ['possuem características que aumentam sucesso reprodutivo no ambiente', 'decidem modificar seus genes', 'não apresentam variação', 'adquirem qualquer característica por vontade', 'vivem sem competir por recursos'], 0, 'Analisar evolução', 'Características hereditárias vantajosas podem tornar-se mais frequentes ao longo das gerações.'),
        item('Vacinas contribuem para a proteção porque:', ['estimulam memória do sistema imune', 'eliminam todos os microrganismos do planeta', 'substituem hábitos de higiene', 'agem como alimento', 'impedem a produção de anticorpos'], 0, 'Compreender imunização', 'A exposição controlada a antígenos prepara células de memória para respostas futuras.')
      ]
    },
    Física: {
      early: [
        item('Uma bola parada começa a se mover quando uma criança a chuta. O chute aplica:', ['uma força', 'uma cor', 'um cheiro', 'uma sombra', 'um som sem ação'], 0, 'Perceber efeitos de forças', 'A força do chute altera o estado de movimento da bola.'),
        item('Para enxergar um objeto em um quarto escuro, é necessário que haja:', ['luz chegando aos olhos após interagir com o objeto', 'apenas som', 'somente calor', 'vento forte', 'água no chão'], 0, 'Compreender a visão', 'Vemos quando a luz refletida pelo objeto chega aos olhos.'),
        item('Qual objeto produz som ao vibrar?', ['Uma corda de violão tocada', 'Uma pedra completamente parada', 'Uma folha sem movimento', 'Um desenho', 'Uma fotografia'], 0, 'Relacionar vibração e som', 'A corda vibrante faz o ar vibrar, produzindo o som.'),
        item('Quando soltamos uma bola, ela cai em direção ao chão por causa:', ['da gravidade', 'da cor', 'do tamanho do quarto', 'do cheiro do ar', 'da luz'], 0, 'Reconhecer ação da gravidade', 'A Terra atrai a bola por meio da força gravitacional.'),
        item('Qual instrumento é usado para medir temperatura?', ['Régua', 'Balança', 'Termômetro', 'Relógio', 'Bússola'], 2, 'Identificar instrumentos de medida', 'O termômetro mede a temperatura de corpos e ambientes.')
      ],
      primary: [
        item('Uma rampa facilita subir uma caixa porque:', ['permite aplicar força ao longo de uma distância maior', 'elimina a massa da caixa', 'faz a gravidade desaparecer', 'produz eletricidade', 'reduz o caminho a zero'], 0, 'Compreender máquina simples', 'O plano inclinado reduz a força necessária, embora aumente a distância percorrida.'),
        item('Em um circuito simples, a lâmpada acende quando:', ['o caminho elétrico está fechado', 'um fio está desconectado', 'não existe fonte de energia', 'a pilha é retirada', 'há apenas plástico entre os terminais'], 0, 'Analisar circuito elétrico', 'A corrente precisa de um caminho fechado entre os terminais da fonte.'),
        item('Uma colher de metal aquece dentro da sopa principalmente por:', ['condução térmica', 'reflexão da luz', 'evaporação do metal', 'magnetização', 'congelamento'], 0, 'Compreender transferência de calor', 'O calor se propaga pelo metal por condução.'),
        item('Ao empurrar duas caixas com a mesma força, a caixa de menor massa tende a:', ['acelerar mais', 'não se mover', 'ficar mais pesada', 'perder toda a energia', 'diminuir de tamanho'], 0, 'Relacionar força, massa e movimento', 'Para a mesma força, o corpo de menor massa apresenta maior aceleração.'),
        item('Energia eólica é obtida principalmente a partir:', ['do movimento do ar', 'da queima de carvão', 'da luz da Lua', 'do petróleo', 'de pilhas descartadas'], 0, 'Reconhecer fonte de energia', 'Turbinas convertem a energia cinética do vento em energia elétrica.')
      ],
      final: [
        item('Um ciclista percorre 120 m em 10 s com velocidade constante. Sua velocidade média é:', ['10 m/s', '12 m/s', '15 m/s', '20 m/s', '1200 m/s'], 1, 'Calcular velocidade média', 'Velocidade média é distância dividida pelo tempo: 120 ÷ 10 = 12 m/s.'),
        item('Um aparelho de 1000 W fica ligado por 2 horas. A energia consumida é:', ['0,5 kWh', '1 kWh', '2 kWh', '20 kWh', '2000 kWh'], 2, 'Calcular consumo elétrico', '1000 W correspondem a 1 kW; 1 kW × 2 h = 2 kWh.'),
        item('Dois resistores de 6 Ω ligados em série apresentam resistência equivalente de:', ['1 Ω', '3 Ω', '6 Ω', '12 Ω', '36 Ω'], 3, 'Analisar associação em série', 'Em série, as resistências se somam: 6 + 6 = 12 Ω.'),
        item('Quando a frequência de uma onda aumenta e sua velocidade permanece constante, o comprimento de onda:', ['aumenta', 'diminui', 'não muda nunca', 'torna-se infinito', 'passa a ser zero sempre'], 1, 'Relacionar grandezas de ondas', 'Como v = λf, mantendo v constante, o aumento de f exige diminuição de λ.'),
        item('Um objeto de massa 2 kg recebe força resultante de 10 N. Sua aceleração é:', ['2 m/s²', '5 m/s²', '8 m/s²', '10 m/s²', '20 m/s²'], 1, 'Aplicar a segunda lei de Newton', 'Pela relação F = ma, a = 10 ÷ 2 = 5 m/s².')
      ]
    },
    Química: {
      early: [
        item('Qual objeto é feito principalmente de metal?', ['Copo de vidro', 'Panela de alumínio', 'Camiseta de algodão', 'Caderno de papel', 'Borracha escolar'], 1, 'Reconhecer materiais', 'O alumínio é um metal usado na fabricação de panelas.'),
        item('Quando colocamos açúcar na água e mexemos até ele não ser mais visto, o açúcar:', ['se dissolve', 'desaparece da matéria', 'vira metal', 'congela', 'transforma-se em luz'], 0, 'Observar dissolução', 'O açúcar continua presente, distribuído na água como uma solução.'),
        item('A água no congelador passa do estado líquido para o:', ['gasoso', 'sólido', 'plasma', 'vapor apenas', 'estado de luz'], 1, 'Reconhecer mudança de estado', 'Ao perder calor, a água congela e passa ao estado sólido.'),
        item('Qual mudança pode ser desfeita com facilidade?', ['Derreter e congelar água', 'Queimar papel', 'Assar um bolo', 'Enferrujar um prego', 'Cozinhar um ovo'], 0, 'Distinguir transformações', 'A mudança de estado da água pode ser revertida sem formar outra substância.'),
        item('Ao usar produto de limpeza, a atitude segura é:', ['seguir o rótulo e pedir ajuda a um adulto', 'misturar todos os produtos', 'provar o líquido', 'aproximar dos olhos', 'guardar em garrafa de refrigerante'], 0, 'Adotar segurança com materiais', 'Rótulos orientam o uso; misturas e contato inadequado podem causar acidentes.')
      ],
      primary: [
        item('Para separar areia misturada à água, pode-se usar:', ['filtração', 'fusão', 'combustão', 'imantação da água', 'congelamento do papel'], 0, 'Separar misturas', 'O filtro retém a areia e permite a passagem da água.'),
        item('A formação de gotículas do lado de fora de um copo gelado ocorre por:', ['condensação do vapor de água do ar', 'vazamento através do vidro', 'fusão do vidro', 'combustão da água', 'desaparecimento do ar'], 0, 'Explicar mudança de estado', 'O vapor de água do ar esfria junto ao copo e condensa.'),
        item('Ao queimar madeira, surgem cinzas e gases. Isso indica:', ['transformação química', 'apenas mudança de lugar', 'separação por peneiração', 'mudança somente de tamanho', 'mistura sem transformação'], 0, 'Reconhecer transformação química', 'Novas substâncias são formadas durante a combustão.'),
        item('Na estação de tratamento, a filtração ajuda a:', ['reter partículas sólidas', 'adicionar lixo', 'produzir petróleo', 'aumentar microrganismos', 'transformar água em metal'], 0, 'Compreender tratamento de água', 'Camadas filtrantes retêm partículas que ainda estão suspensas na água.'),
        item('Uma mistura de água e óleo apresenta:', ['duas fases visíveis', 'uma única substância', 'apenas estado gasoso', 'reação explosiva obrigatória', 'desaparecimento do óleo'], 0, 'Identificar mistura heterogênea', 'Água e óleo não se misturam completamente e formam fases distintas.')
      ],
      final: [
        item('O número atômico de um elemento corresponde ao número de:', ['nêutrons apenas', 'prótons no núcleo', 'moléculas', 'ligações químicas', 'camadas ocupadas sempre'], 1, 'Compreender estrutura atômica', 'A identidade do elemento é definida pelo número de prótons.'),
        item('Uma solução com pH 3 é classificada como:', ['ácida', 'neutra', 'básica', 'metálica', 'radioativa obrigatoriamente'], 0, 'Interpretar escala de pH', 'Valores de pH menores que 7 indicam caráter ácido.'),
        item('Na equação 2H₂ + O₂ → 2H₂O, a proporção entre H₂ e O₂ é:', ['1:1', '2:1', '1:2', '2:2', '4:1'], 1, 'Interpretar coeficientes estequiométricos', 'Os coeficientes mostram duas unidades de H₂ para uma de O₂.'),
        item('Qual situação representa transformação química?', ['Gelo derretendo', 'Papel sendo cortado', 'Ferro enferrujando', 'Água evaporando', 'Sal sendo triturado'], 2, 'Distinguir transformação química', 'Na ferrugem, o ferro reage e forma novas substâncias.'),
        item('Elementos de uma mesma família da tabela periódica apresentam, em geral:', ['propriedades químicas semelhantes', 'o mesmo número de massa', 'igual quantidade de nêutrons', 'o mesmo estado físico sempre', 'nomes com a mesma letra'], 0, 'Interpretar organização periódica', 'A configuração da camada de valência contribui para propriedades semelhantes na família.')
      ]
    }
  };

  const topicSuggestions = {
    early: {
      Matemática: ['adição e subtração', 'sequências numéricas', 'dinheiro', 'formas geométricas', 'dezenas e unidades'],
      Português: ['sílabas', 'rimas', 'leitura de frases', 'plural', 'ordem das palavras'],
      História: ['minha história', 'família e memória', 'rotina e tempo', 'bairro', 'tradições'],
      Geografia: ['minha escola', 'meu bairro', 'paisagens', 'campo e cidade', 'tempo atmosférico'],
      Biologia: ['seres vivos', 'plantas', 'corpo humano', 'higiene', 'animais'],
      Física: ['movimento', 'luz', 'som', 'gravidade', 'temperatura'],
      Química: ['materiais', 'água', 'misturas simples', 'estados da matéria', 'segurança']
    },
    primary: {
      Matemática: ['multiplicação', 'divisão', 'frações', 'perímetro', 'gráficos e tabelas'],
      Português: ['interpretação de texto', 'pontuação', 'gêneros textuais', 'verbos', 'pronomes'],
      História: ['povos originários', 'patrimônio cultural', 'cultura afro-brasileira', 'migrações', 'fontes históricas'],
      Geografia: ['mapas e legendas', 'regiões brasileiras', 'rios', 'urbanização', 'escala'],
      Biologia: ['animais vertebrados', 'fotossíntese', 'ecossistemas', 'corpo humano', 'saúde'],
      Física: ['máquinas simples', 'circuitos', 'calor', 'forças', 'fontes de energia'],
      Química: ['separação de misturas', 'mudanças de estado', 'transformações', 'tratamento de água', 'soluções']
    },
    final: {
      Matemática: ['equações', 'porcentagem', 'estatística', 'teorema de Pitágoras', 'probabilidade'],
      Português: ['coesão textual', 'figuras de linguagem', 'argumentação', 'sintaxe', 'gêneros jornalísticos'],
      História: ['mundo antigo', 'mercantilismo', 'Revolução Industrial', 'Brasil pós-abolição', 'Guerra Fria'],
      Geografia: ['migrações', 'cartografia', 'globalização', 'biomas brasileiros', 'urbanização'],
      Biologia: ['células', 'ecologia', 'genética', 'evolução', 'imunologia'],
      Física: ['cinemática', 'energia elétrica', 'circuitos', 'ondas', 'dinâmica'],
      Química: ['estrutura atômica', 'pH', 'estequiometria', 'reações químicas', 'tabela periódica']
    }
  };

  function profile(code) {
    return schoolYears.find((year) => year.code === code) || schoolYears[5];
  }

  function buildFundamentalRound(subject, code) {
    const year = profile(code);
    const pool = banks[subject]?.[year.band] || banks.Matemática[year.band];
    const offset = (year.order + subject.length) % pool.length;
    const ordered = [...pool.slice(offset), ...pool.slice(0, offset)];
    return Array.from({ length: 10 }, (_, index) => {
      const base = ordered[index % ordered.length];
      return {
        ...base,
        a: [...base.a],
        q: base.q,
        note: `${base.note} Conteúdo selecionado para ${year.label}.`,
        origin: 'BNCC',
        schoolYear: year.code,
        source: {
          label: `Referência curricular: BNCC · ${year.label}`,
          url: 'https://basenacionalcomum.mec.gov.br/abase/'
        }
      };
    });
  }

  function suggestions(subject, code, fallback) {
    const year = profile(code);
    if (year.stage === 'Médio') return fallback || [];
    return topicSuggestions[year.band]?.[subject] || fallback || [];
  }

  window.EstudaGradeContent = { schoolYears, profile, buildFundamentalRound, suggestions };
})();
