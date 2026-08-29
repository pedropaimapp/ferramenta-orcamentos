insert into configuracao_pagamento (id) values (1);

insert into faixas_pagamento (valor_min_centavos, valor_max_centavos, parcelas_sem_juros) values
  (0, 100000, 1),
  (100000, 200000, 2),
  (200000, 300000, 3),
  (300000, null, 4);
