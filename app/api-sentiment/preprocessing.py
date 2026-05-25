import re
from Sastrawi.Stemmer.StemmerFactory import StemmerFactory
from Sastrawi.StopWordRemover.StopWordRemoverFactory import StopWordRemoverFactory

_stem_factory = StemmerFactory()
_stemmer = _stem_factory.create_stemmer()

_sw_factory = StopWordRemoverFactory()
_all_stopwords = set(_sw_factory.get_stop_words())

_sentiment_keep = {
    'tidak','tak','bukan','tanpa','jangan','belum','namun','tapi','tetapi',
    'sangat','sekali','banget','amat','terlalu','lebih','kurang','cukup',
    'agak','lumayan','sedikit','banyak',
    'baik','bagus','buruk','jelek','enak','susah','mudah','sulit','gampang',
    'senang','puas','kecewa','nyaman','aman','bahaya','parah','berat',
    'seru','membosankan','menarik','membingungkan','menyenangkan','mengecewakan',
    'cepat','lambat','lancar','error','gagal','berhasil','ngelag','lag','loading',
    'perlu','harus','bisa','mampu','ingin','mau','butuh',
    'semoga','harap','tolong','mohon','sarankan','harapkan',
    'penting','kritis','darurat','mendesak',
    'kacau','berantakan','amburadul',
    'bosen','bosan','capek','lelah','males','malas',
    'keren','mantap','hebat','oke','ok',
    'sayang','sayangnya','disayangkan',
    'ribet','rumit',
    'nggak','engga','enggak','gak','ga','ngga',
    'memprihatinkan',
}

_stopwords_filtered = _all_stopwords - _sentiment_keep

_slang_dict = {
    "ga":"tidak","gak":"tidak","gk":"tidak","ngga":"tidak",
    "nggak":"tidak","enggak":"tidak","engga":"tidak",
    "kagak":"tidak","kaga":"tidak","gakbisa":"tidak bisa",
    "bgt":"banget","bngt":"banget","bgtt":"banget",
    "yg":"yang","dgn":"dengan","utk":"untuk","krn":"karena",
    "sdh":"sudah","blm":"belum","jg":"juga","lg":"lagi",
    "tp":"tapi","gpp":"tidak apa","mksh":"terima kasih","tks":"terima kasih",
    "makasih":"terima kasih","makasi":"terima kasih",
    "moga":"semoga","smg":"semoga",
    "lmyn":"lumayan","lumya":"lumayan",
    "ngeleg":"ngelag","loading":"lambat",
    "eror":"error","err":"error",
    "oke":"ok","okee":"ok","okelah":"ok",
    "klo":"kalau","klu":"kalau","kl":"kalau","klw":"kalau",
    "udh":"sudah","udah":"sudah","dah":"sudah",
    "nih":"ini","tuh":"itu",
    "bener":"benar","bner":"benar",
    "gmn":"bagaimana","gimana":"bagaimana",
    "knp":"kenapa","kpn":"kapan",
    "mhs":"mahasiswa","maba":"mahasiswa baru",
    "pnitia":"panitia",
    "down":"mati","update":"perbarui","upgrade":"tingkatkan",
    "smpb":"spmb","ppkmb":"pkkmb","pkmb":"pkkmb",
    "mau":"ingin","pengen":"ingin","pengin":"ingin",
    "cape":"capek",
    "boring":"membosankan","bored":"bosan","bore":"bosan",
    "bad":"buruk","good":"baik",
    "thanks":"terima kasih","thx":"terima kasih","ty":"terima kasih",
    "mantul":"mantap",
    "parah":"parah","ancur":"hancur",
}


def preprocess(text: str) -> str:
    text = str(text).lower()
    text = re.sub(r'(.)\1{2,}', r'\1\1', text)
    text = re.sub(r'http\S+|www\.\S+', '', text)
    text = re.sub(r'@\w+|#\w+', '', text)
    text = re.sub(r'[^a-zA-Z\s]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    tokens = text.split()
    tokens = [_slang_dict.get(w, w) for w in tokens]
    tokens = [w for w in tokens if w not in _stopwords_filtered and len(w) > 1]
    text = ' '.join(tokens)
    text = _stemmer.stem(text)
    return text.strip()