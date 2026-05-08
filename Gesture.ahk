#Requires AutoHotkey v2.0
#SingleInstance Force

SetTitleMatchMode(2)
w := "IntelAudioService"

#HotIf WinActive(w)
F13::Send("^!h")
F14::Send("^!w")
F15::Send("^!s")
F16::Send("^!a")
F17::Send("^!d")
F18::Send("^!c")
F19::Send("^!{Enter}")
F20::Send("^!p")
F21::Send("^!o")
F22::Send("^!r")
#HotIf