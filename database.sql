--
-- PostgreSQL database dump
--

-- Dumped from database version 15.12
-- Dumped by pg_dump version 15.12

-- Started on 2026-07-20 16:40:06

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 3 (class 3079 OID 33890)
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- TOC entry 3417 (class 0 OID 0)
-- Dependencies: 3
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- TOC entry 2 (class 3079 OID 33853)
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- TOC entry 3418 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- TOC entry 910 (class 1247 OID 33972)
-- Name: question_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.question_type AS ENUM (
    'CHOICE',
    'JUDGE'
);


ALTER TYPE public.question_type OWNER TO postgres;

--
-- TOC entry 284 (class 1255 OID 33988)
-- Name: set_question_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_question_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.set_question_updated_at() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 216 (class 1259 OID 33977)
-- Name: Question; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Question" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    type public.question_type NOT NULL,
    content text NOT NULL,
    options jsonb,
    answer character varying(10) NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now(),
    "updatedAt" timestamp with time zone DEFAULT now()
);


ALTER TABLE public."Question" OWNER TO postgres;

--
-- TOC entry 3411 (class 0 OID 33977)
-- Dependencies: 216
-- Data for Name: Question; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Question" (id, type, content, options, answer, "createdAt", "updatedAt") FROM stdin;
6fb5991b-1b66-43c8-bf96-0a39ace4446b	JUDGE	酶在高温环境下通常会发生变性，活性降低或丧失。	\N	对	2026-06-11 16:49:44.057113+08	2026-06-11 16:49:44.057113+08
6c0082d2-cb0b-405e-a682-23c67e6acd52	JUDGE	DNA 的基本组成单位是氨基酸。	\N	错	2026-06-11 16:49:44.057113+08	2026-06-11 16:49:44.057113+08
41c1a7ff-47dc-4b30-9c9b-b474a4cbafc5	CHOICE	下列哪一项是植物细胞特有的结构？	[{"text": "细胞膜", "label": "A"}, {"text": "细胞核", "label": "B"}, {"text": "叶绿体", "label": "C"}, {"text": "线粒体", "label": "D"}]	D	2026-06-11 16:49:44.057113+08	2026-06-11 22:31:11.227748+08
29eeefd4-b88a-4354-b1f1-8fc4c6d056c0	CHOICE	以下哪句话是对的	[{"text": "666", "label": "A"}, {"text": "777", "label": "B"}, {"text": "888", "label": "C"}, {"text": "999", "label": "D"}]	A	2026-06-11 23:20:31.850728+08	2026-06-11 23:20:31.850728+08
2abee6df-5f3b-4757-aa2f-9fab0b611c93	JUDGE	666？	\N	对	2026-06-11 23:25:26.415687+08	2026-06-11 23:25:26.415687+08
a8b34a83-52bb-4d7b-8416-f540ddcaff71	JUDGE	555	\N	错	2026-07-17 11:39:15.688009+08	2026-07-17 12:19:59.14624+08
90f56c9f-181a-4aa1-a27c-ad8f0c26dba9	CHOICE	？？？	[{"text": "2", "label": "A"}, {"text": "4", "label": "B"}, {"text": "2", "label": "C"}, {"text": "3", "label": "D"}]	B	2026-07-17 11:39:05.199653+08	2026-07-17 12:20:07.833456+08
4cabb25f-e816-4d14-9578-e93ee3d4ae5d	JUDGE	在测定胃蛋白酶活性时，将溶液的pH由10降到2的过程中，胃蛋白酶的活性将逐渐增强。	\N	错	2026-07-17 12:20:39.90775+08	2026-07-17 12:20:39.90775+08
5602398a-c154-482f-aed8-d5785321311f	JUDGE	无氧呼吸的第一阶段产生[H]，第二阶段消耗[H]，所以整个无氧呼吸无[H]积累。	\N	对	2026-07-17 12:20:39.922611+08	2026-07-17 12:20:39.922611+08
bca3b16f-fd34-42cf-968d-42bad29e0fa9	JUDGE	煮沸酵母菌培养液的目的是杀死杂菌并控制自变量（有无氧气）。	\N	对	2026-07-17 12:20:39.931132+08	2026-07-17 12:20:39.931132+08
5a4f8a53-6769-4c7c-93ad-33d0e9c9c553	JUDGE	线粒体的内膜所含的蛋白质比线粒体外膜更多。	\N	对	2026-07-17 12:20:39.941414+08	2026-07-17 12:20:39.941414+08
1ac0b4d0-af8b-48ef-89ab-6699438f7fd7	JUDGE	光合作用产物C₆H₁₂O₆中的碳和氧来自CO₂，氢来自水。	\N	对	2026-07-17 12:20:39.948736+08	2026-07-17 12:20:39.948736+08
2c100653-d572-41a7-bcbd-5ac06680c68b	JUDGE	当光合作用正常进行时，三碳化合物比五碳化合物多。	\N	对	2026-07-17 12:20:39.957042+08	2026-07-17 12:20:39.957042+08
be991200-f7c5-4a0f-89d9-daf34dac7b5e	JUDGE	在光合作用的相关实验中，可以通过测定绿色植物在光照条件下CO₂的吸收量、O₂释放量以及有机物的积累量来体现植物实际光合作用的强度。	\N	对	2026-07-17 12:20:39.967464+08	2026-07-17 12:20:39.967464+08
ada3c914-1767-4eda-968a-df5c06884a4c	JUDGE	给植物施用有机肥，不仅能为植物提供生命活动所需的无机盐，还能为植物生命活动提供CO₂与能量。	\N	对	2026-07-17 12:20:39.976595+08	2026-07-17 12:20:39.976595+08
d1ae14f8-fbbb-404e-a3a6-1dde63e9e5ad	JUDGE	光合作用中合成的NADPH中的H都来自于水，呼吸作用中的合成的[H]中的氢都来自于有机物。	\N	对	2026-07-17 12:20:39.985917+08	2026-07-17 12:20:39.985917+08
cdab0e2a-12c3-4a0f-b623-ddb8e180d9b9	CHOICE	某种昆虫的体色由常染色体上的等位基因A（黑色）和a（浅色）控制，且AA个体在胚胎期致死。现有一对浅色个体杂交，后代中黑色与浅色的比例为（）	[{"text": "1:1", "label": "A"}, {"text": "2:1", "label": "B"}, {"text": "3:1", "label": "C"}, {"text": "全为浅色", "label": "D"}]	A	2026-07-17 16:14:43.675121+08	2026-07-17 16:26:25.995053+08
38713e57-9799-4575-aa79-3a3e189fcd91	JUDGE	酶是活细胞产生的具有催化作用的蛋白质，酶的催化作用既可发生在细胞内，也可以发生在细胞外。	\N	错	2026-07-17 12:20:40.022849+08	2026-07-17 16:26:32.821283+08
eff4fd72-c42d-4693-bc7f-e785f4d774d0	CHOICE	下列关于细胞中元素和化合物的叙述，正确的是（）	[{"text": "组成淀粉、糖原和纤维素的单体种类不同", "label": "A"}, {"text": "DNA和RNA分子的碱基组成完全相同", "label": "B"}, {"text": "蛋白质分子中的N主要存在于氨基中", "label": "C"}, {"text": "脂肪是细胞内良好的储能物质，但不等同于能源物质", "label": "D"}]	D	2026-07-17 16:14:43.570267+08	2026-07-17 16:24:23.816269+08
8b470c42-c5e7-4db1-ba30-4b2b758753de	JUDGE	人长时间剧烈运动时，骨骼肌细胞中每摩尔葡萄糖生成ATP的量与安静时相等。555	\N	对	2026-07-17 12:20:40.005144+08	2026-07-17 15:17:47.088085+08
e72d3d2b-9639-46d3-945a-7dc27c1e4bef	JUDGE	对于呼吸作用来说，有H₂O生成一定是有氧呼吸，有CO₂生成一定不是乳酸发酵。有酒精生成的呼吸一定有无氧呼吸，动物细胞无氧呼吸一定不会产生酒精。	\N	对	2026-07-17 12:20:40.013664+08	2026-07-17 16:08:53.535295+08
25ce4318-ef44-4dd1-8a43-fc00d6c6071d	CHOICE	某植物细胞在适宜条件下进行光合作用，若突然降低环境中CO₂浓度，短时间内叶绿体内C₃和C₅的含量变化分别是（）	[{"text": "C₃增加，C₅减少", "label": "A"}, {"text": "C₃减少，C₅增加", "label": "B"}, {"text": "C₃增加，C₅增加", "label": "C"}, {"text": "C₃减少，C₅减少", "label": "D"}]	B	2026-07-17 16:14:43.609245+08	2026-07-17 16:14:43.609245+08
0b2aea96-9a5a-4993-8ea8-8173b6c2c6b7	CHOICE	下列有关人体内环境及其稳态的叙述，错误的是（）	[{"text": "血浆中的葡萄糖、无机盐等可以调节渗透压", "label": "A"}, {"text": "内环境温度、pH的稳定依赖神经—体液—免疫调节网络", "label": "B"}, {"text": "组织液渗入淋巴的量多于渗入血浆的量", "label": "C"}, {"text": "剧烈运动后血浆pH会因乳酸积累而明显下降", "label": "D"}]	D	2026-07-17 16:14:43.655517+08	2026-07-17 16:25:40.333757+08
ae9dee42-52d9-4cfa-affa-46317bfd6e85	CHOICE	某二倍体动物体细胞含有8条染色体，其一个精原细胞在进行减数分裂过程中，若发生了一次交叉互换（不考虑其他变异），则产生的四个精子中，染色体数目全部正常且含来自父方染色体的精子数最多为（）	[{"text": "1个", "label": "A"}, {"text": "2个", "label": "B"}, {"text": "3个", "label": "C"}, {"text": "4个", "label": "D"}]	B	2026-07-17 16:14:43.629625+08	2026-07-17 16:25:45.338124+08
\.


--
-- TOC entry 3266 (class 2606 OID 33986)
-- Name: Question Question_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Question"
    ADD CONSTRAINT "Question_pkey" PRIMARY KEY (id);


--
-- TOC entry 3267 (class 1259 OID 33987)
-- Name: idx_question_content_trgm; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_question_content_trgm ON public."Question" USING gin (content public.gin_trgm_ops);


--
-- TOC entry 3268 (class 2620 OID 42055)
-- Name: Question trg_question_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_question_updated_at BEFORE UPDATE ON public."Question" FOR EACH ROW EXECUTE FUNCTION public.set_question_updated_at();


-- Completed on 2026-07-20 16:40:06

--
-- PostgreSQL database dump complete
--

