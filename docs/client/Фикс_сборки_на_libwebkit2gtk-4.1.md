
# Решение сделать alias pkg-config

Создаём fake alias, чтобы 4.1 выглядел как 4.0.

### Узнаём путь pkgconfig

```bash
pkg-config --variable pc_path pkg-config
```

обычно:

```bash
/usr/lib/x86_64-linux-gnu/pkgconfig
```

### Создём alias

```bash
cd /usr/lib/x86_64-linux-gnu/pkgconfig
sudo ln -s webkit2gtk-4.1.pc webkit2gtk-4.0.pc
```

Проверка:

```bash
pkg-config --modversion webkit2gtk-4.0
```

должно вернуть:

```bash
2.50.4
```

Теперь:

```bash
wails doctor
wails dev
```

Работает стабильно.